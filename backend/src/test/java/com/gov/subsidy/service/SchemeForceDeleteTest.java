package com.gov.subsidy.service;

import com.gov.subsidy.entity.Application;
import com.gov.subsidy.entity.Scheme;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.SchemeMapper;
import com.gov.subsidy.repository.*;
import com.gov.subsidy.service.impl.SchemeServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SchemeForceDeleteTest {

    @Mock
    private SchemeRepository schemeRepository;

    @Mock
    private SchemeMapper schemeMapper;

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private ApplicationDocumentRepository applicationDocumentRepository;

    @Mock
    private VerificationRepository verificationRepository;

    @Mock
    private VerificationHistoryRepository verificationHistoryRepository;

    @Mock
    private WorkflowAuditLogRepository workflowAuditLogRepository;

    @Mock
    private DisbursementPlanRepository disbursementPlanRepository;

    @Mock
    private DisbursementMilestoneRepository disbursementMilestoneRepository;

    @Mock
    private DisbursementRepository disbursementRepository;

    @Mock
    private ComplianceRepository complianceRepository;

    @Mock
    private FundUtilizationRepository fundUtilizationRepository;

    @Mock
    private RoutingRecordRepository routingRecordRepository;

    @InjectMocks
    private SchemeServiceImpl schemeService;

    private Scheme testScheme;
    private Application testApplication;

    @BeforeEach
    public void setUp() {
        testScheme = Scheme.builder()
                .id(10L)
                .name("Force Delete Test Scheme")
                .code("FD-TEST-2026")
                .budgetAllocation(new BigDecimal("1000000.00"))
                .remainingBudget(new BigDecimal("1000000.00"))
                .active(true)
                .build();

        testApplication = Application.builder()
                .id(100L)
                .applicationNumber("APP-2026-000100")
                .scheme(testScheme)
                .build();
    }

    @Test
    @DisplayName("Force delete scheme with 0 applications should succeed")
    public void testForceDeleteScheme_NoApplications_Success() {
        when(schemeRepository.findById(10L)).thenReturn(Optional.of(testScheme));
        when(applicationRepository.findBySchemeId(10L)).thenReturn(Collections.emptyList());

        assertDoesNotThrow(() -> schemeService.forceDeleteScheme(10L));

        verify(schemeRepository, times(1)).delete(testScheme);
        verify(applicationRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Force delete scheme with applications should cascade delete all child records and scheme")
    public void testForceDeleteScheme_WithApplications_CascadesDeletion() {
        when(schemeRepository.findById(10L)).thenReturn(Optional.of(testScheme));
        when(applicationRepository.findBySchemeId(10L)).thenReturn(List.of(testApplication));
        when(verificationRepository.findByApplicationId(100L)).thenReturn(Optional.empty());
        when(disbursementPlanRepository.findByApplicationId(100L)).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> schemeService.forceDeleteScheme(10L));

        verify(applicationRepository, times(1)).delete(testApplication);
        verify(schemeRepository, times(1)).delete(testScheme);
    }

    @Test
    @DisplayName("Force delete non-existent scheme should throw ResourceNotFoundException")
    public void testForceDeleteScheme_NotFound_ThrowsException() {
        when(schemeRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> schemeService.forceDeleteScheme(999L));
    }
}
