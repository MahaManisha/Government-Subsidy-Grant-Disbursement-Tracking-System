package com.gov.subsidy.mapper;

import com.gov.subsidy.dto.ComplianceDto;
import com.gov.subsidy.entity.Compliance;
import org.springframework.stereotype.Component;

@Component
public class ComplianceMapper {

    public ComplianceDto toDto(Compliance entity) {
        if (entity == null) {
            return null;
        }

        String beneficiaryName = "";
        if (entity.getBeneficiary() != null && entity.getBeneficiary().getUser() != null) {
            beneficiaryName = entity.getBeneficiary().getUser().getFirstName() + " " + entity.getBeneficiary().getUser().getLastName();
        }

        return ComplianceDto.builder()
                .id(entity.getId())
                .applicationId(entity.getApplication().getId())
                .applicationNumber(entity.getApplication().getApplicationNumber())
                .beneficiaryId(entity.getBeneficiary().getId())
                .beneficiaryName(beneficiaryName.trim())
                .disbursementId(entity.getDisbursement() != null ? entity.getDisbursement().getId() : null)
                .milestoneNumber(entity.getMilestoneNumber())
                .uploadedProofMetadata(entity.getUploadedProofMetadata())
                .inspectionDate(entity.getInspectionDate())
                .officerRemarks(entity.getOfficerRemarks())
                .status(entity.getStatus() == null ? null : entity.getStatus().name())
                .nextDueDate(entity.getNextDueDate())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }
}
