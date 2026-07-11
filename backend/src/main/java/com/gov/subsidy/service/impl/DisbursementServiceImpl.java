package com.gov.subsidy.service.impl;

import com.gov.subsidy.dto.DisbursementMilestoneRequestDto;
import com.gov.subsidy.dto.DisbursementPlanDto;
import com.gov.subsidy.dto.DisbursementPlanRequestDto;
import com.gov.subsidy.dto.DisbursementPlanUpdateRequestDto;
import com.gov.subsidy.entity.*;
import com.gov.subsidy.enums.ApplicationStatus;
import com.gov.subsidy.enums.ComplianceStatus;
import com.gov.subsidy.enums.DisbursementPlanStatus;
import com.gov.subsidy.enums.DisbursementStatus;
import com.gov.subsidy.exception.DuplicateResourceException;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.DisbursementPlanMapper;
import com.gov.subsidy.repository.*;
import com.gov.subsidy.service.DisbursementService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class DisbursementServiceImpl implements DisbursementService {

    private final DisbursementPlanRepository planRepository;
    private final DisbursementMilestoneRepository milestoneRepository;
    private final ApplicationRepository applicationRepository;
    private final DisbursementRepository disbursementRepository;
    private final ComplianceRepository complianceRepository;
    private final UserRepository userRepository;
    private final DisbursementPlanMapper planMapper;

    public DisbursementServiceImpl(DisbursementPlanRepository planRepository,
                                   DisbursementMilestoneRepository milestoneRepository,
                                   ApplicationRepository applicationRepository,
                                   DisbursementRepository disbursementRepository,
                                   ComplianceRepository complianceRepository,
                                   UserRepository userRepository,
                                   DisbursementPlanMapper planMapper) {
        this.planRepository = planRepository;
        this.milestoneRepository = milestoneRepository;
        this.applicationRepository = applicationRepository;
        this.disbursementRepository = disbursementRepository;
        this.complianceRepository = complianceRepository;
        this.userRepository = userRepository;
        this.planMapper = planMapper;
    }

    @Override
    public DisbursementPlanDto createPlan(DisbursementPlanRequestDto request) {
        // 1. Validate: Application exists
        Application application = applicationRepository.findById(request.getApplicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with ID: " + request.getApplicationId()));

        // 2. Validate: Application must be APPROVED or READY_FOR_DISBURSEMENT
        if (application.getWorkflowStatus() != ApplicationStatus.APPROVED && 
            application.getWorkflowStatus() != ApplicationStatus.READY_FOR_DISBURSEMENT) {
            throw new IllegalArgumentException("Application must be APPROVED to create a disbursement plan. Current status: " + application.getWorkflowStatus());
        }

        // 3. Validate: Plan does not already exist for this application
        if (planRepository.existsByApplicationId(request.getApplicationId())) {
            throw new DuplicateResourceException("Disbursement plan already exists for application ID: " + request.getApplicationId());
        }

        // 4. Validate milestones
        validateMilestones(request.getMilestones());

        // 5. Create DisbursementPlan entity
        DisbursementPlan plan = DisbursementPlan.builder()
                .application(application)
                .status(DisbursementPlanStatus.ACTIVE)
                .remarks(request.getRemarks())
                .build();

        // 6. Generate milestones and associate with plan
        BigDecimal baseAmount = application.getApprovedAmount();
        if (baseAmount == null || baseAmount.compareTo(BigDecimal.ZERO) <= 0) {
            baseAmount = application.getRequestedAmount();
        }

        List<DisbursementMilestone> milestones = generateMilestones(plan, baseAmount, request.getMilestones());
        plan.setMilestones(milestones);

        DisbursementPlan saved = planRepository.save(plan);
        return planMapper.toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public DisbursementPlanDto getPlan(Long id) {
        DisbursementPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Disbursement plan not found with ID: " + id));
        return planMapper.toDto(plan);
    }

    @Override
    @Transactional(readOnly = true)
    public DisbursementPlanDto getPlanByApplicationId(Long applicationId) {
        DisbursementPlan plan = planRepository.findByApplicationId(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Disbursement plan not found for application ID: " + applicationId));
        return planMapper.toDto(plan);
    }

    @Override
    public DisbursementPlanDto updatePlan(Long id, DisbursementPlanUpdateRequestDto request) {
        DisbursementPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Disbursement plan not found with ID: " + id));

        if (plan.getStatus() == DisbursementPlanStatus.CANCELLED) {
            throw new IllegalArgumentException("Cannot update a cancelled disbursement plan");
        }

        // Validate milestones
        validateMilestones(request.getMilestones());

        // Clear existing milestones and generate new ones
        plan.getMilestones().clear();
        planRepository.saveAndFlush(plan); // Ensure clear is flushed to DB to avoid constraint/duplicate issues

        Application application = plan.getApplication();
        BigDecimal baseAmount = application.getApprovedAmount();
        if (baseAmount == null || baseAmount.compareTo(BigDecimal.ZERO) <= 0) {
            baseAmount = application.getRequestedAmount();
        }

        List<DisbursementMilestone> newMilestones = generateMilestones(plan, baseAmount, request.getMilestones());
        plan.getMilestones().addAll(newMilestones);
        plan.setRemarks(request.getRemarks());

        DisbursementPlan updated = planRepository.save(plan);
        return planMapper.toDto(updated);
    }

    @Override
    public DisbursementPlanDto cancelPlan(Long id) {
        DisbursementPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Disbursement plan not found with ID: " + id));

        if (plan.getStatus() == DisbursementPlanStatus.CANCELLED) {
            throw new IllegalArgumentException("Disbursement plan is already cancelled");
        }

        plan.setStatus(DisbursementPlanStatus.CANCELLED);
        for (DisbursementMilestone milestone : plan.getMilestones()) {
            if (milestone.getPaymentStatus() == DisbursementStatus.PENDING || milestone.getPaymentStatus() == DisbursementStatus.PROCESSING) {
                milestone.setPaymentStatus(DisbursementStatus.FAILED);
            }
        }

        DisbursementPlan cancelled = planRepository.save(plan);
        return planMapper.toDto(cancelled);
    }

    @Override
    public DisbursementPlanDto releaseMilestone(Long planId, Integer milestoneNumber, Long financeOfficerId) {
        DisbursementPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("Disbursement plan not found with ID: " + planId));

        if (plan.getStatus() == DisbursementPlanStatus.CANCELLED) {
            throw new IllegalArgumentException("Cannot release milestone for a cancelled disbursement plan");
        }

        // Find the target milestone
        DisbursementMilestone targetMilestone = plan.getMilestones().stream()
                .filter(m -> m.getMilestoneNumber().equals(milestoneNumber))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Milestone number " + milestoneNumber + " not found in plan"));

        if (targetMilestone.getPaymentStatus() == DisbursementStatus.SUCCESS) {
            throw new IllegalArgumentException("Milestone " + milestoneNumber + " has already been successfully released");
        }

        // MANDATORY COMPLIANCE CHECK FOR SUBSEQUENT MILESTONES
        if (milestoneNumber > 1) {
            int previousMilestoneNumber = milestoneNumber - 1;
            
            // Find if the previous milestone is SUCCESS
            DisbursementMilestone previousMilestone = plan.getMilestones().stream()
                    .filter(m -> m.getMilestoneNumber() == previousMilestoneNumber)
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("Previous milestone " + previousMilestoneNumber + " not found"));
            
            if (previousMilestone.getPaymentStatus() != DisbursementStatus.SUCCESS) {
                throw new IllegalArgumentException("Cannot release milestone " + milestoneNumber + " because the previous milestone " + previousMilestoneNumber + " is not paid");
            }

            // Check if there is a COMPLIANT compliance record for the previous milestone
            boolean isCompliant = complianceRepository.existsByApplicationIdAndMilestoneNumberAndStatus(
                    plan.getApplication().getId(), previousMilestoneNumber, ComplianceStatus.COMPLIANT);
            
            if (!isCompliant) {
                throw new IllegalArgumentException("Cannot release milestone " + milestoneNumber + " because compliance verification for milestone " + previousMilestoneNumber + " is mandatory and has not been approved (COMPLIANT) yet.");
            }
        }

        // Fetch Finance Officer User
        User officer = userRepository.findById(financeOfficerId)
                .orElseThrow(() -> new ResourceNotFoundException("Finance officer not found with ID: " + financeOfficerId));

        // Update milestone payment status
        targetMilestone.setPaymentStatus(DisbursementStatus.SUCCESS);
        
        // Generate standard Disbursement transaction record
        Disbursement disbursement = Disbursement.builder()
                .application(plan.getApplication())
                .financeOfficer(officer)
                .amount(targetMilestone.getAmount())
                .status(DisbursementStatus.SUCCESS)
                .transactionId("TXN-" + System.currentTimeMillis() + "-" + milestoneNumber)
                .disbursementDate(LocalDateTime.now())
                .remarks("Released milestone " + milestoneNumber + " (" + targetMilestone.getPercentage() + "%)")
                .build();
        
        disbursementRepository.save(disbursement);
        
        // Save plan
        DisbursementPlan savedPlan = planRepository.save(plan);

        // Update application progress upon releasing milestone
        Application application = plan.getApplication();
        if (milestoneNumber == 1) {
            application.setWorkflowStatus(ApplicationStatus.READY_FOR_DISBURSEMENT);
            application.setRemarks("Milestone 1 released. Awaiting compliance check before Milestone 2.");
        } else {
            application.setRemarks("Milestone " + milestoneNumber + " released. Awaiting compliance check before next milestone.");
        }
        applicationRepository.save(application);

        return planMapper.toDto(savedPlan);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DisbursementPlanDto> getAllPlans() {
        return planRepository.findAll().stream()
                .map(planMapper::toDto)
                .collect(Collectors.toList());
    }

    private void validateMilestones(List<DisbursementMilestoneRequestDto> milestoneDtos) {
        if (milestoneDtos == null || milestoneDtos.isEmpty()) {
            throw new IllegalArgumentException("Disbursement plan must contain at least one milestone");
        }

        BigDecimal totalPercentage = BigDecimal.ZERO;
        for (DisbursementMilestoneRequestDto dto : milestoneDtos) {
            if (dto.getPercentage() == null) {
                throw new IllegalArgumentException("Milestone percentage is required");
            }
            if (dto.getPercentage().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Milestone percentage must be greater than zero");
            }
            totalPercentage = totalPercentage.add(dto.getPercentage());
        }

        if (totalPercentage.compareTo(BigDecimal.valueOf(100)) != 0) {
            throw new IllegalArgumentException("Total milestone percentage must equal 100%. Current sum: " + totalPercentage);
        }
    }

    private List<DisbursementMilestone> generateMilestones(DisbursementPlan plan, BigDecimal approvedAmount, List<DisbursementMilestoneRequestDto> milestoneDtos) {
        List<DisbursementMilestone> milestones = new ArrayList<>();
        BigDecimal totalCalculatedAmount = BigDecimal.ZERO;
        LocalDateTime now = LocalDateTime.now();

        for (int i = 0; i < milestoneDtos.size(); i++) {
            int milestoneNumber = i + 1;
            BigDecimal percentage = milestoneDtos.get(i).getPercentage();
            BigDecimal amount = approvedAmount.multiply(percentage).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            totalCalculatedAmount = totalCalculatedAmount.add(amount);

            // Scheduled Date: Milestone 1 is now, Milestone 2 is now + 30 days, Milestone 3 is now + 60 days, etc.
            LocalDateTime scheduledDate = now.plusDays(30L * (milestoneNumber - 1));

            DisbursementMilestone milestone = DisbursementMilestone.builder()
                    .disbursementPlan(plan)
                    .milestoneNumber(milestoneNumber)
                    .percentage(percentage)
                    .amount(amount)
                    .scheduledDate(scheduledDate)
                    .paymentStatus(DisbursementStatus.PENDING)
                    .remainingBalance(BigDecimal.ZERO) // calculated below
                    .build();

            milestones.add(milestone);
        }

        // Adjust the last milestone's amount to handle rounding differences
        if (totalCalculatedAmount.compareTo(approvedAmount) != 0) {
            BigDecimal difference = approvedAmount.subtract(totalCalculatedAmount);
            DisbursementMilestone lastMilestone = milestones.get(milestones.size() - 1);
            BigDecimal adjustedAmount = lastMilestone.getAmount().add(difference);
            lastMilestone.setAmount(adjustedAmount);
        }

        // Calculate remaining balances sequentially
        BigDecimal currentBalance = approvedAmount;
        for (DisbursementMilestone milestone : milestones) {
            currentBalance = currentBalance.subtract(milestone.getAmount());
            milestone.setRemainingBalance(currentBalance);
        }

        return milestones;
    }
}
