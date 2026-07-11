package com.gov.subsidy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsReportDto {
    private Map<String, BigDecimal> fundsReleasedByDistrict;
    private Map<String, BigDecimal> fundsReleasedByState;
    private Map<String, Long> applicationsByScheme;
    private Double approvalPercentage;
    private Double rejectionPercentage;
    private Double compliancePercentage;
    private Long pendingVerificationCount;
    private Long totalBeneficiaries;
    private BigDecimal totalFundsReleased;
    private Double averageEligibilityScore;
    private String mostPopularScheme;
    private String highestFundUtilizationDistrict;
}
