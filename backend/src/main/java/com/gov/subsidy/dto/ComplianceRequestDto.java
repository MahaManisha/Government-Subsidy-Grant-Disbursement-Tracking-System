package com.gov.subsidy.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplianceRequestDto {

    @NotNull(message = "Application ID is required")
    private Long applicationId;

    private Long disbursementId; // optional link to Disbursement

    private Integer milestoneNumber; // optional, to identify which milestone this compliance refers to

    private String uploadedProofMetadata;

    private LocalDateTime inspectionDate;

    private String officerRemarks;

    private LocalDateTime nextDueDate;
}
