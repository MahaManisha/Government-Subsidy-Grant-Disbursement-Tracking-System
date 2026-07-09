package com.gov.subsidy.mapper;

import com.gov.subsidy.dto.ApplicationCreateDto;
import com.gov.subsidy.dto.ApplicationDto;
import com.gov.subsidy.entity.Application;
import com.gov.subsidy.enums.ApplicationStatus;
import com.gov.subsidy.enums.EligibilityResult;
import com.gov.subsidy.enums.PriorityLevel;
import com.gov.subsidy.enums.WorkflowStage;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class ApplicationMapper implements GenericMapper<Application, ApplicationDto> {

    private final BeneficiaryMapper beneficiaryMapper;
    private final SchemeMapper schemeMapper;
    private final UserMapper userMapper;

    public ApplicationMapper(BeneficiaryMapper beneficiaryMapper, SchemeMapper schemeMapper, UserMapper userMapper) {
        this.beneficiaryMapper = beneficiaryMapper;
        this.schemeMapper = schemeMapper;
        this.userMapper = userMapper;
    }

    @Override
    public ApplicationDto toDto(Application entity) {
        if (entity == null) {
            return null;
        }

        return ApplicationDto.builder()
                .id(entity.getId())
                .beneficiary(beneficiaryMapper.toDto(entity.getBeneficiary()))
                .scheme(schemeMapper.toDto(entity.getScheme()))
                .applicationNumber(entity.getApplicationNumber())
                .requestedAmount(entity.getRequestedAmount())
                .approvedAmount(entity.getApprovedAmount())
                .workflowStatus(entity.getWorkflowStatus() == null ? null : entity.getWorkflowStatus().name())
                .currentStage(entity.getCurrentStage() == null ? null : entity.getCurrentStage().name())
                .eligibilityScore(entity.getEligibilityScore())
                .eligibilityResult(entity.getEligibilityResult() == null ? null : entity.getEligibilityResult().name())
                .assignedOfficer(userMapper.toDto(entity.getAssignedOfficer()))
                .submittedDate(entity.getSubmittedDate())
                .verifiedDate(entity.getVerifiedDate())
                .approvedDate(entity.getApprovedDate())
                .lastModifiedDate(entity.getLastModifiedDate())
                .remarks(entity.getRemarks())
                .priority(entity.getPriority() == null ? null : entity.getPriority().name())
                .isFlagged(entity.isFlagged())
                .reVerificationRequested(entity.isReVerificationRequested())
                .rejectionReason(entity.getRejectionReason())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }

    @Override
    public Application toEntity(ApplicationDto dto) {
        if (dto == null) {
            return null;
        }

        Application application = Application.builder()
                .id(dto.getId())
                .beneficiary(beneficiaryMapper.toEntity(dto.getBeneficiary()))
                .scheme(schemeMapper.toEntity(dto.getScheme()))
                .applicationNumber(dto.getApplicationNumber())
                .requestedAmount(dto.getRequestedAmount())
                .approvedAmount(dto.getApprovedAmount())
                .workflowStatus(dto.getWorkflowStatus() == null ? null : ApplicationStatus.valueOf(dto.getWorkflowStatus()))
                .currentStage(dto.getCurrentStage() == null ? null : WorkflowStage.valueOf(dto.getCurrentStage()))
                .eligibilityScore(dto.getEligibilityScore())
                .eligibilityResult(dto.getEligibilityResult() == null ? null : EligibilityResult.valueOf(dto.getEligibilityResult()))
                .assignedOfficer(userMapper.toEntity(dto.getAssignedOfficer()))
                .submittedDate(dto.getSubmittedDate())
                .verifiedDate(dto.getVerifiedDate())
                .approvedDate(dto.getApprovedDate())
                .lastModifiedDate(dto.getLastModifiedDate())
                .remarks(dto.getRemarks())
                .priority(dto.getPriority() == null ? null : PriorityLevel.valueOf(dto.getPriority()))
                .isFlagged(dto.isFlagged())
                .reVerificationRequested(dto.isReVerificationRequested())
                .rejectionReason(dto.getRejectionReason())
                .build();

        application.setCreatedAt(dto.getCreatedAt());
        application.setUpdatedAt(dto.getUpdatedAt());
        application.setCreatedBy(dto.getCreatedBy());
        application.setUpdatedBy(dto.getUpdatedBy());
        return application;
    }

    public Application toEntity(ApplicationCreateDto createDto) {
        if (createDto == null) {
            return null;
        }

        return Application.builder()
                .requestedAmount(createDto.getRequestedAmount())
                .workflowStatus(ApplicationStatus.SUBMITTED)
                .currentStage(WorkflowStage.INITIATION)
                .submittedDate(LocalDateTime.now())
                .priority(createDto.getPriority() == null ? null : PriorityLevel.valueOf(createDto.getPriority()))
                .isFlagged(false)
                .reVerificationRequested(false)
                .build();
    }
}
