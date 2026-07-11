package com.gov.subsidy.service.impl;

import com.gov.subsidy.dto.FundUtilizationDto;
import com.gov.subsidy.dto.FundUtilizationRequestDto;
import com.gov.subsidy.dto.FundUtilizationSummaryDto;
import com.gov.subsidy.dto.FundUtilizationVerificationDto;
import com.gov.subsidy.entity.*;
import com.gov.subsidy.enums.DisbursementStatus;
import com.gov.subsidy.enums.VerificationStatus;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.FundUtilizationMapper;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.DisbursementPlanRepository;
import com.gov.subsidy.repository.DisbursementRepository;
import com.gov.subsidy.repository.FundUtilizationRepository;
import com.gov.subsidy.service.FundUtilizationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class FundUtilizationServiceImpl implements FundUtilizationService {

    private final FundUtilizationRepository utilizationRepository;
    private final ApplicationRepository applicationRepository;
    private final DisbursementRepository disbursementRepository;
    private final DisbursementPlanRepository planRepository;
    private final FundUtilizationMapper utilizationMapper;

    public FundUtilizationServiceImpl(FundUtilizationRepository utilizationRepository,
                                       ApplicationRepository applicationRepository,
                                       DisbursementRepository disbursementRepository,
                                       DisbursementPlanRepository planRepository,
                                       FundUtilizationMapper utilizationMapper) {
        this.utilizationRepository = utilizationRepository;
        this.applicationRepository = applicationRepository;
        this.disbursementRepository = disbursementRepository;
        this.planRepository = planRepository;
        this.utilizationMapper = utilizationMapper;
    }

    @Override
    public FundUtilizationDto submitUtilization(FundUtilizationRequestDto request) {
        Application application = applicationRepository.findById(request.getApplicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with ID: " + request.getApplicationId()));

        DisbursementPlan plan = planRepository.findByApplicationId(application.getId())
                .orElseThrow(() -> new IllegalArgumentException("No disbursement plan exists for Application ID: " + application.getId()));

        // Calculate total released amount (SUCCESS milestones)
        BigDecimal totalReleasedAmount = plan.getMilestones().stream()
                .filter(m -> m.getPaymentStatus() == DisbursementStatus.SUCCESS)
                .map(DisbursementMilestone::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalReleasedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("No funds have been released for this application yet. Cannot submit fund utilization.");
        }

        // Sum existing non-rejected utilizations
        BigDecimal totalUtilizedSoFar = utilizationRepository.findByApplicationId(application.getId()).stream()
                .filter(u -> u.getStatus() != VerificationStatus.REJECTED)
                .map(FundUtilization::getAmountUtilized)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalUtilizedSoFar.add(request.getAmountUtilized()).compareTo(totalReleasedAmount) > 0) {
            throw new IllegalArgumentException("Utilization amount exceeds total released disbursement amount. Released: " + totalReleasedAmount + ", Utilized so far: " + totalUtilizedSoFar + ", Requested: " + request.getAmountUtilized());
        }

        Disbursement disbursement = null;
        if (request.getDisbursementId() != null) {
            disbursement = disbursementRepository.findById(request.getDisbursementId())
                    .orElseThrow(() -> new ResourceNotFoundException("Disbursement transaction not found with ID: " + request.getDisbursementId()));
            
            if (!disbursement.getApplication().getId().equals(application.getId())) {
                throw new IllegalArgumentException("Disbursement transaction does not belong to the target Application");
            }
        }

        FundUtilization utilization = FundUtilization.builder()
                .application(application)
                .beneficiary(application.getBeneficiary())
                .disbursement(disbursement)
                .amountUtilized(request.getAmountUtilized())
                .purpose(request.getPurpose())
                .supportingDocsMetadata(request.getSupportingDocsMetadata())
                .remarks(request.getRemarks())
                .submissionDate(LocalDateTime.now())
                .status(VerificationStatus.PENDING)
                .build();

        FundUtilization saved = utilizationRepository.save(utilization);
        return utilizationMapper.toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public FundUtilizationDto getUtilizationDetails(Long id) {
        FundUtilization utilization = utilizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fund utilization record not found with ID: " + id));
        return utilizationMapper.toDto(utilization);
    }

    @Override
    public FundUtilizationDto verifyUtilization(Long id, VerificationStatus status, FundUtilizationVerificationDto request) {
        FundUtilization utilization = utilizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fund utilization record not found with ID: " + id));

        if (status == null || (status != VerificationStatus.VERIFIED && status != VerificationStatus.REJECTED)) {
            throw new IllegalArgumentException("Verification status must be either VERIFIED or REJECTED");
        }

        utilization.setStatus(status);
        if (request.getRemarks() != null) {
            utilization.setRemarks(request.getRemarks());
        }

        FundUtilization saved = utilizationRepository.save(utilization);
        return utilizationMapper.toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public FundUtilizationSummaryDto getUtilizationSummary(Long applicationId) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with ID: " + applicationId));

        DisbursementPlan plan = planRepository.findByApplicationId(applicationId).orElse(null);
        BigDecimal totalReleasedAmount = BigDecimal.ZERO;

        if (plan != null) {
            totalReleasedAmount = plan.getMilestones().stream()
                    .filter(m -> m.getPaymentStatus() == DisbursementStatus.SUCCESS)
                    .map(DisbursementMilestone::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        List<FundUtilization> utilizations = utilizationRepository.findByApplicationId(applicationId);

        // Sum VERIFIED utilizations for summary calculation
        BigDecimal totalUtilizedAmount = utilizations.stream()
                .filter(u -> u.getStatus() == VerificationStatus.VERIFIED)
                .map(FundUtilization::getAmountUtilized)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal remainingAmount = totalReleasedAmount.subtract(totalUtilizedAmount);
        if (remainingAmount.compareTo(BigDecimal.ZERO) < 0) {
            remainingAmount = BigDecimal.ZERO;
        }

        double utilizationPercentage = 0.0;
        if (totalReleasedAmount.compareTo(BigDecimal.ZERO) > 0) {
            utilizationPercentage = totalUtilizedAmount.multiply(BigDecimal.valueOf(100))
                    .divide(totalReleasedAmount, 2, RoundingMode.HALF_UP)
                    .doubleValue();
        }

        List<FundUtilizationDto> utilizationDtos = utilizations.stream()
                .map(utilizationMapper::toDto)
                .collect(Collectors.toList());

        return FundUtilizationSummaryDto.builder()
                .applicationId(applicationId)
                .applicationNumber(application.getApplicationNumber())
                .totalReleasedAmount(totalReleasedAmount)
                .totalUtilizedAmount(totalUtilizedAmount)
                .remainingAmount(remainingAmount)
                .utilizationPercentage(utilizationPercentage)
                .utilizations(utilizationDtos)
                .build();
    }
}
