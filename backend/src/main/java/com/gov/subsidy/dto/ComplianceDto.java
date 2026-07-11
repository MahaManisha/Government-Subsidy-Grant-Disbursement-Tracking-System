package com.gov.subsidy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplianceDto {
    private Long id;
    private Long applicationId;
    private String applicationNumber;
    private Long beneficiaryId;
    private String beneficiaryName;
    private Long disbursementId;
    private Integer milestoneNumber;
    private String uploadedProofMetadata;
    private LocalDateTime inspectionDate;
    private String officerRemarks;
    private String status;
    private LocalDateTime nextDueDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}
