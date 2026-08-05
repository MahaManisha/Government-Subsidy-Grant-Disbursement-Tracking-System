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
public class DisbursementDto {
    private Long id;
    private Long applicationId;
    private Long financeOfficerId;
    private BigDecimal amount;
    private String status;
    private String transactionId;
    private LocalDateTime disbursementDate;
    private String remarks;
}
