package com.gov.subsidy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FundUtilizationSummaryDto {
    private Long applicationId;
    private String applicationNumber;
    private BigDecimal totalReleasedAmount;
    private BigDecimal totalUtilizedAmount;
    private BigDecimal remainingAmount;
    private Double utilizationPercentage;
    private List<FundUtilizationDto> utilizations;
}
