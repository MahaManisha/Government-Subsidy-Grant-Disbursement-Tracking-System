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
public class DisbursementMilestoneDto {
    private Long id;
    private Integer milestoneNumber;
    private BigDecimal percentage;
    private BigDecimal amount;
    private LocalDateTime scheduledDate;
    private String paymentStatus;
    private BigDecimal remainingBalance;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}
