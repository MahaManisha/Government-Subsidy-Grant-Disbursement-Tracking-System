package com.gov.subsidy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FundUtilizationDto {
    private Long id;
    private Long applicationId;
    private String applicationNumber;
    private Long beneficiaryId;
    private String beneficiaryName;
    private Long disbursementId;
    private BigDecimal amountUtilized;
    private String purpose;
    private String supportingDocsMetadata;
    private String remarks;
    private LocalDateTime submissionDate;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
