package com.gov.subsidy.service.impl;

import com.gov.subsidy.dto.ComplianceDto;
import com.gov.subsidy.dto.ComplianceRequestDto;
import com.gov.subsidy.dto.ComplianceUpdateDto;
import com.gov.subsidy.entity.Application;
import com.gov.subsidy.entity.Compliance;
import com.gov.subsidy.entity.Disbursement;
import com.gov.subsidy.entity.DisbursementPlan;
import com.gov.subsidy.enums.ApplicationStatus;
import com.gov.subsidy.enums.ComplianceStatus;
import com.gov.subsidy.enums.WorkflowStage;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.ComplianceMapper;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.ComplianceRepository;
import com.gov.subsidy.repository.DisbursementPlanRepository;
import com.gov.subsidy.repository.DisbursementRepository;
import com.gov.subsidy.service.ComplianceService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ComplianceServiceImpl implements ComplianceService {

    private final ComplianceRepository complianceRepository;
    private final ApplicationRepository applicationRepository;
    private final DisbursementRepository disbursementRepository;
    private final DisbursementPlanRepository planRepository;
    private final ComplianceMapper complianceMapper;

    public ComplianceServiceImpl(ComplianceRepository complianceRepository,
                                 ApplicationRepository applicationRepository,
                                 DisbursementRepository disbursementRepository,
                                 DisbursementPlanRepository planRepository,
                                 ComplianceMapper complianceMapper) {
        this.complianceRepository = complianceRepository;
        this.applicationRepository = applicationRepository;
        this.disbursementRepository = disbursementRepository;
        this.planRepository = planRepository;
        this.complianceMapper = complianceMapper;
    }

    @Override
    public ComplianceDto createComplianceRecord(ComplianceRequestDto request) {
        Application application = applicationRepository.findById(request.getApplicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with ID: " + request.getApplicationId()));

        Disbursement disbursement = null;
        if (request.getDisbursementId() != null) {
            disbursement = disbursementRepository.findById(request.getDisbursementId())
                    .orElseThrow(() -> new ResourceNotFoundException("Disbursement not found with ID: " + request.getDisbursementId()));
            
            if (!disbursement.getApplication().getId().equals(application.getId())) {
                throw new IllegalArgumentException("Disbursement ID " + request.getDisbursementId() + " does not belong to Application ID " + request.getApplicationId());
            }
        }

        // Determine initial status: UNDER_REVIEW if proof metadata exists, PENDING otherwise
        ComplianceStatus initialStatus = (request.getUploadedProofMetadata() != null && !request.getUploadedProofMetadata().trim().isEmpty())
                ? ComplianceStatus.UNDER_REVIEW
                : ComplianceStatus.PENDING;

        Compliance compliance = Compliance.builder()
                .application(application)
                .beneficiary(application.getBeneficiary())
                .disbursement(disbursement)
                .milestoneNumber(request.getMilestoneNumber())
                .uploadedProofMetadata(request.getUploadedProofMetadata())
                .inspectionDate(request.getInspectionDate())
                .officerRemarks(request.getOfficerRemarks())
                .status(initialStatus)
                .nextDueDate(request.getNextDueDate())
                .build();

        Compliance saved = complianceRepository.save(compliance);
        return complianceMapper.toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ComplianceDto getComplianceDetails(Long id) {
        Compliance compliance = complianceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Compliance record not found with ID: " + id));
        return complianceMapper.toDto(compliance);
    }

    @Override
    public ComplianceDto updateCompliance(Long id, ComplianceUpdateDto request) {
        Compliance compliance = complianceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Compliance record not found with ID: " + id));

        if (compliance.getStatus() == ComplianceStatus.COMPLIANT) {
            throw new IllegalArgumentException("Cannot update a completed COMPLIANT record");
        }

        if (request.getUploadedProofMetadata() != null) {
            compliance.setUploadedProofMetadata(request.getUploadedProofMetadata());
            if (compliance.getStatus() == ComplianceStatus.PENDING && !request.getUploadedProofMetadata().trim().isEmpty()) {
                compliance.setStatus(ComplianceStatus.UNDER_REVIEW);
            }
        }
        if (request.getInspectionDate() != null) {
            compliance.setInspectionDate(request.getInspectionDate());
        }
        if (request.getOfficerRemarks() != null) {
            compliance.setOfficerRemarks(request.getOfficerRemarks());
        }
        if (request.getStatus() != null) {
            compliance.setStatus(ComplianceStatus.valueOf(request.getStatus().trim().toUpperCase()));
        }
        if (request.getNextDueDate() != null) {
            compliance.setNextDueDate(request.getNextDueDate());
        }

        Compliance updated = complianceRepository.save(compliance);
        return complianceMapper.toDto(updated);
    }

    @Override
    public ComplianceDto approveCompliance(Long id) {
        Compliance compliance = complianceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Compliance record not found with ID: " + id));

        if (compliance.getStatus() == ComplianceStatus.COMPLIANT) {
            return complianceMapper.toDto(compliance);
        }

        compliance.setStatus(ComplianceStatus.COMPLIANT);
        Compliance saved = complianceRepository.save(compliance);

        // Update application progress
        Application application = compliance.getApplication();
        DisbursementPlan plan = planRepository.findByApplicationId(application.getId()).orElse(null);
        
        if (plan != null && compliance.getMilestoneNumber() != null) {
            int totalMilestones = plan.getMilestones().size();
            if (compliance.getMilestoneNumber() == totalMilestones) {
                // Final milestone completed
                application.setWorkflowStatus(ApplicationStatus.DISBURSED);
                application.setCurrentStage(WorkflowStage.COMPLETED);
                application.setRemarks("All disbursement milestones completed and compliant.");
            } else {
                // Intermediate milestone completed
                application.setWorkflowStatus(ApplicationStatus.READY_FOR_DISBURSEMENT);
                application.setRemarks("Compliance approved for milestone " + compliance.getMilestoneNumber() + ". Ready for next milestone.");
            }
            applicationRepository.save(application);
        }

        return complianceMapper.toDto(saved);
    }

    @Override
    public ComplianceDto rejectCompliance(Long id, String reason) {
        Compliance compliance = complianceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Compliance record not found with ID: " + id));

        compliance.setStatus(ComplianceStatus.REJECTED);
        if (reason != null && !reason.trim().isEmpty()) {
            compliance.setOfficerRemarks(reason);
        }
        Compliance saved = complianceRepository.save(compliance);

        // Update application progress upon rejection
        Application application = compliance.getApplication();
        application.setRemarks("Compliance rejected for milestone " + compliance.getMilestoneNumber() + ". Reason: " + reason);
        applicationRepository.save(application);

        return complianceMapper.toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplianceDto> getCompliancesByApplication(Long applicationId) {
        return complianceRepository.findByApplicationId(applicationId).stream()
                .map(complianceMapper::toDto)
                .collect(Collectors.toList());
    }
}
