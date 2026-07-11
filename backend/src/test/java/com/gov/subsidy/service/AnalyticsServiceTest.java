package com.gov.subsidy.service;

import com.gov.subsidy.dto.AnalyticsReportDto;
import com.gov.subsidy.repository.*;
import com.gov.subsidy.service.impl.AnalyticsServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class AnalyticsServiceTest {

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private BeneficiaryRepository beneficiaryRepository;

    @Mock
    private ComplianceRepository complianceRepository;

    @Mock
    private FundUtilizationRepository utilizationRepository;

    @Mock
    private DisbursementMilestoneRepository milestoneRepository;

    @InjectMocks
    private AnalyticsServiceImpl analyticsService;

    @Test
    public void testGetRegionalAnalytics_CalculatesCorrectly() {
        // District released amounts mockup
        Object[] row1 = new Object[]{"District A", BigDecimal.valueOf(50000)};
        Object[] row2 = new Object[]{"District B", BigDecimal.valueOf(120000)};
        when(milestoneRepository.sumAmountReleasedByDistrict()).thenReturn(Arrays.asList(row1, row2));

        // State released amounts mockup
        Object[] stateRow1 = new Object[]{"State X", BigDecimal.valueOf(170000)};
        when(milestoneRepository.sumAmountReleasedByState()).thenReturn(Collections.singletonList(stateRow1));

        // Applications by scheme mockup
        Object[] schemeRow1 = new Object[]{"Solar Scheme", 15L};
        Object[] schemeRow2 = new Object[]{"Agricultural Scheme", 22L};
        when(applicationRepository.countApplicationsByScheme()).thenReturn(Arrays.asList(schemeRow1, schemeRow2));

        // Counts mockup
        when(applicationRepository.count()).thenReturn(100L);
        when(applicationRepository.countByWorkflowStatusIn(anyList())).thenReturn(45L); // Approved, ready, disbursed
        when(applicationRepository.countByWorkflowStatus(any())).thenReturn(10L); // Rejected

        // Compliance mockup
        when(complianceRepository.count()).thenReturn(50L);
        when(complianceRepository.countByStatus(any())).thenReturn(40L); // Compliant count

        // General counters mockup
        when(beneficiaryRepository.count()).thenReturn(80L);
        when(milestoneRepository.sumTotalAmountReleased()).thenReturn(BigDecimal.valueOf(170000));
        when(applicationRepository.averageEligibilityScore()).thenReturn(72.55);

        // Popular scheme & highest utilization mockup
        Object[] popScheme = new Object[]{"Agricultural Scheme", 22L};
        when(applicationRepository.findMostPopularScheme()).thenReturn(Collections.singletonList(popScheme));

        Object[] highestUtilDistrict = new Object[]{"District B", BigDecimal.valueOf(95000)};
        when(utilizationRepository.findHighestFundUtilizationDistrict()).thenReturn(Collections.singletonList(highestUtilDistrict));

        // Run
        AnalyticsReportDto report = analyticsService.getRegionalAnalytics();

        // Asserts
        assertNotNull(report);
        assertEquals(BigDecimal.valueOf(50000), report.getFundsReleasedByDistrict().get("District A"));
        assertEquals(BigDecimal.valueOf(120000), report.getFundsReleasedByDistrict().get("District B"));
        assertEquals(BigDecimal.valueOf(170000), report.getFundsReleasedByState().get("State X"));
        assertEquals(15L, report.getApplicationsByScheme().get("Solar Scheme"));
        assertEquals(22L, report.getApplicationsByScheme().get("Agricultural Scheme"));
        assertEquals(45.0, report.getApprovalPercentage());
        assertEquals(10.0, report.getRejectionPercentage());
        assertEquals(80.0, report.getCompliancePercentage());
        assertEquals(80L, report.getTotalBeneficiaries());
        assertEquals(BigDecimal.valueOf(170000), report.getTotalFundsReleased());
        assertEquals(72.55, report.getAverageEligibilityScore());
        assertEquals("Agricultural Scheme", report.getMostPopularScheme());
        assertEquals("District B", report.getHighestFundUtilizationDistrict());
    }
}
