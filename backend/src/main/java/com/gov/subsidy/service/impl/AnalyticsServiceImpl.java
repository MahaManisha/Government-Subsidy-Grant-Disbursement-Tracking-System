package com.gov.subsidy.service.impl;

import com.gov.subsidy.dto.AnalyticsReportDto;
import com.gov.subsidy.enums.ApplicationStatus;
import com.gov.subsidy.enums.ComplianceStatus;
import com.gov.subsidy.repository.*;
import com.gov.subsidy.service.AnalyticsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class AnalyticsServiceImpl implements AnalyticsService {

    private final ApplicationRepository applicationRepository;
    private final BeneficiaryRepository beneficiaryRepository;
    private final ComplianceRepository complianceRepository;
    private final FundUtilizationRepository utilizationRepository;
    private final DisbursementMilestoneRepository milestoneRepository;

    public AnalyticsServiceImpl(ApplicationRepository applicationRepository,
                                BeneficiaryRepository beneficiaryRepository,
                                ComplianceRepository complianceRepository,
                                FundUtilizationRepository utilizationRepository,
                                DisbursementMilestoneRepository milestoneRepository) {
        this.applicationRepository = applicationRepository;
        this.beneficiaryRepository = beneficiaryRepository;
        this.complianceRepository = complianceRepository;
        this.utilizationRepository = utilizationRepository;
        this.milestoneRepository = milestoneRepository;
    }

    @Override
    public AnalyticsReportDto getRegionalAnalytics() {
        // 1. Funds Released by District
        List<Object[]> districtData = milestoneRepository.sumAmountReleasedByDistrict();
        Map<String, BigDecimal> fundsReleasedByDistrict = new HashMap<>();
        for (Object[] row : districtData) {
            String district = row[0] != null ? row[0].toString() : "Unknown";
            BigDecimal amount = row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO;
            fundsReleasedByDistrict.put(district, amount);
        }

        // 2. Funds Released by State
        List<Object[]> stateData = milestoneRepository.sumAmountReleasedByState();
        Map<String, BigDecimal> fundsReleasedByState = new HashMap<>();
        for (Object[] row : stateData) {
            String state = row[0] != null ? row[0].toString() : "Unknown";
            BigDecimal amount = row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO;
            fundsReleasedByState.put(state, amount);
        }

        // 3. Applications by Scheme
        List<Object[]> schemeData = applicationRepository.countApplicationsByScheme();
        Map<String, Long> applicationsByScheme = new HashMap<>();
        for (Object[] row : schemeData) {
            String schemeName = row[0] != null ? row[0].toString() : "Unknown";
            Long count = row[1] != null ? ((Number) row[1]).longValue() : 0L;
            applicationsByScheme.put(schemeName, count);
        }

        // 4. Approval and Rejection Percentages
        long totalApps = applicationRepository.count();
        double approvalPercentage = 0.0;
        double rejectionPercentage = 0.0;
        if (totalApps > 0) {
            long approvedCount = applicationRepository.countByWorkflowStatusIn(
                    List.of(ApplicationStatus.APPROVED, ApplicationStatus.READY_FOR_DISBURSEMENT, ApplicationStatus.DISBURSED)
            );
            long rejectedCount = applicationRepository.countByWorkflowStatus(ApplicationStatus.REJECTED);

            approvalPercentage = BigDecimal.valueOf(approvedCount * 100.0)
                    .divide(BigDecimal.valueOf(totalApps), 2, RoundingMode.HALF_UP)
                    .doubleValue();
            
            rejectionPercentage = BigDecimal.valueOf(rejectedCount * 100.0)
                    .divide(BigDecimal.valueOf(totalApps), 2, RoundingMode.HALF_UP)
                    .doubleValue();
        }

        // 5. Compliance Percentage
        long totalCompliance = complianceRepository.count();
        double compliancePercentage = 0.0;
        if (totalCompliance > 0) {
            long compliantCount = complianceRepository.countByStatus(ComplianceStatus.COMPLIANT);
            compliancePercentage = BigDecimal.valueOf(compliantCount * 100.0)
                    .divide(BigDecimal.valueOf(totalCompliance), 2, RoundingMode.HALF_UP)
                    .doubleValue();
        }

        // 6. Pending Verification Count
        long pendingVerificationCount = applicationRepository.countByWorkflowStatusIn(
                List.of(ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.RE_VERIFICATION_REQUESTED)
        );

        // 7. Total Beneficiaries
        long totalBeneficiaries = beneficiaryRepository.count();

        // 8. Total Funds Released
        BigDecimal totalFundsReleased = milestoneRepository.sumTotalAmountReleased();
        if (totalFundsReleased == null) {
            totalFundsReleased = BigDecimal.ZERO;
        }

        // 9. Average Eligibility Score
        Double averageEligibilityScore = applicationRepository.averageEligibilityScore();
        if (averageEligibilityScore == null) {
            averageEligibilityScore = 0.0;
        } else {
            averageEligibilityScore = BigDecimal.valueOf(averageEligibilityScore)
                    .setScale(2, RoundingMode.HALF_UP)
                    .doubleValue();
        }

        // 10. Most Popular Scheme
        List<Object[]> popularSchemeData = applicationRepository.findMostPopularScheme();
        String mostPopularScheme = (popularSchemeData != null && !popularSchemeData.isEmpty())
                ? (popularSchemeData.get(0)[0] != null ? popularSchemeData.get(0)[0].toString() : "N/A")
                : "N/A";

        // 11. Highest Fund Utilization District
        List<Object[]> highestUtilizedDistrictData = utilizationRepository.findHighestFundUtilizationDistrict();
        String highestFundUtilizationDistrict = (highestUtilizedDistrictData != null && !highestUtilizedDistrictData.isEmpty())
                ? (highestUtilizedDistrictData.get(0)[0] != null ? highestUtilizedDistrictData.get(0)[0].toString() : "N/A")
                : "N/A";

        return AnalyticsReportDto.builder()
                .fundsReleasedByDistrict(fundsReleasedByDistrict)
                .fundsReleasedByState(fundsReleasedByState)
                .applicationsByScheme(applicationsByScheme)
                .approvalPercentage(approvalPercentage)
                .rejectionPercentage(rejectionPercentage)
                .compliancePercentage(compliancePercentage)
                .pendingVerificationCount(pendingVerificationCount)
                .totalBeneficiaries(totalBeneficiaries)
                .totalFundsReleased(totalFundsReleased)
                .averageEligibilityScore(averageEligibilityScore)
                .mostPopularScheme(mostPopularScheme)
                .highestFundUtilizationDistrict(highestFundUtilizationDistrict)
                .build();
    }
}
