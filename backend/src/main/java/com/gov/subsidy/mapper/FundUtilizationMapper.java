package com.gov.subsidy.mapper;

import com.gov.subsidy.dto.FundUtilizationDto;
import com.gov.subsidy.entity.FundUtilization;
import org.springframework.stereotype.Component;

@Component
public class FundUtilizationMapper {

    public FundUtilizationDto toDto(FundUtilization entity) {
        if (entity == null) {
            return null;
        }

        String beneficiaryName = "";
        if (entity.getBeneficiary() != null && entity.getBeneficiary().getUser() != null) {
            beneficiaryName = entity.getBeneficiary().getUser().getFirstName() + " " + entity.getBeneficiary().getUser().getLastName();
        }

        return FundUtilizationDto.builder()
                .id(entity.getId())
                .applicationId(entity.getApplication().getId())
                .applicationNumber(entity.getApplication().getApplicationNumber())
                .beneficiaryId(entity.getBeneficiary().getId())
                .beneficiaryName(beneficiaryName.trim())
                .disbursementId(entity.getDisbursement() != null ? entity.getDisbursement().getId() : null)
                .amountUtilized(entity.getAmountUtilized())
                .purpose(entity.getPurpose())
                .supportingDocsMetadata(entity.getSupportingDocsMetadata())
                .remarks(entity.getRemarks())
                .submissionDate(entity.getSubmissionDate())
                .status(entity.getStatus() == null ? null : entity.getStatus().name())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
