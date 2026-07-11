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
public class ComplianceUpdateDto {
    private String uploadedProofMetadata;
    private LocalDateTime inspectionDate;
    private String officerRemarks;
    private String status;
    private LocalDateTime nextDueDate;
}
