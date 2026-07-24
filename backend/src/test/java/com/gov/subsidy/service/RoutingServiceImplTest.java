package com.gov.subsidy.service;

import com.gov.subsidy.config.RoutingConfig;
import com.gov.subsidy.dto.RoutingResponseDto;
import com.gov.subsidy.entity.Application;
import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.entity.RoutingRecord;
import com.gov.subsidy.entity.User;
import com.gov.subsidy.enums.*;
import com.gov.subsidy.exception.InvalidWorkflowTransitionException;
import com.gov.subsidy.mapper.ApplicationMapper;
import com.gov.subsidy.mapper.RoutingMapper;
import com.gov.subsidy.mapper.UserMapper;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.RoutingRecordRepository;
import com.gov.subsidy.repository.UserRepository;
import com.gov.subsidy.service.impl.RoutingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link RoutingServiceImpl} — the auto-routing decision tree
 * described in Module 2: "straightforward cases fast-tracked, flagged or
 * high-value cases escalated for additional scrutiny."
 *
 * <p>Uses the real {@link RoutingConfig} defaults:
 * fastTrackScoreThreshold=90, highAmountThreshold=500000,
 * veryHighAmountThreshold=1000000, suspiciousScoreThreshold=30.</p>
 */
@ExtendWith(MockitoExtension.class)
public class RoutingServiceImplTest {

    @Mock private ApplicationRepository applicationRepository;
    @Mock private UserRepository userRepository;
    @Mock private RoutingRecordRepository routingRecordRepository;
    @Mock private ApplicationMapper applicationMapper;
    @Mock private RoutingMapper routingMapper;
    @Mock private UserMapper userMapper;

    private RoutingConfig routingConfig;
    private RoutingServiceImpl routingService;

    private Beneficiary beneficiary;
    private User fieldOfficer;
    private User districtOfficer;
    private User financeOfficer;

    @BeforeEach
    public void setUp() {
        routingConfig = new RoutingConfig(); // real defaults, no Spring context needed
        routingService = new RoutingServiceImpl(applicationRepository, userRepository,
                routingRecordRepository, routingConfig, applicationMapper, routingMapper, userMapper);

        beneficiary = Beneficiary.builder().id(5L).build();
        fieldOfficer = User.builder().id(10L).firstName("Field").lastName("Officer").build();
        districtOfficer = User.builder().id(20L).firstName("District").lastName("Officer").build();
        financeOfficer = User.builder().id(30L).firstName("Finance").lastName("Officer").build();

        // Common stubs used by every test path (buildResponse() always calls these)
        lenient().when(routingRecordRepository.findByApplicationIdOrderByRoutedAtAsc(any()))
                .thenReturn(Collections.emptyList());
        lenient().when(routingRecordRepository.save(any(RoutingRecord.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        lenient().when(applicationRepository.save(any(Application.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private Application app(int score, long amount, PriorityLevel priority, boolean flagged) {
        return Application.builder()
                .id(1L)
                .applicationNumber("APP-2026-000001")
                .beneficiary(beneficiary)
                .eligibilityScore(score)
                .requestedAmount(BigDecimal.valueOf(amount))
                .priority(priority)
                .isFlagged(flagged)
                .workflowStatus(ApplicationStatus.SUBMITTED)
                .build();
    }

    @Test
    public void routeApplication_fastTracks_whenHighScoreAndLowAmount() {
        Application application = app(95, 100_000, PriorityLevel.MEDIUM, false);
        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(userRepository.findLeastLoadedActiveUsersByRole(RoleType.ROLE_FIELD_OFFICER))
                .thenReturn(List.of(fieldOfficer));

        RoutingResponseDto result = routingService.routeApplication(1L);

        assertEquals("FAST_TRACK", result.getDecision());
        assertEquals(fieldOfficer, application.getAssignedOfficer());
        assertEquals(ApplicationStatus.UNDER_REVIEW, application.getWorkflowStatus());
    }

    @Test
    public void routeApplication_routesToDistrictOfficer_whenAmountIsHigh() {
        Application application = app(60, 600_000, PriorityLevel.MEDIUM, false);
        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(userRepository.findLeastLoadedActiveUsersByRole(RoleType.ROLE_DISTRICT_OFFICER))
                .thenReturn(List.of(districtOfficer));

        RoutingResponseDto result = routingService.routeApplication(1L);

        assertEquals("DISTRICT_REVIEW", result.getDecision());
        assertEquals(districtOfficer, application.getAssignedOfficer());
    }

    @Test
    public void routeApplication_routesToFinanceOfficer_whenAmountIsVeryHigh() {
        Application application = app(60, 1_200_000, PriorityLevel.MEDIUM, false);
        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(userRepository.findLeastLoadedActiveUsersByRole(RoleType.ROLE_FINANCE_OFFICER))
                .thenReturn(List.of(financeOfficer));

        RoutingResponseDto result = routingService.routeApplication(1L);

        assertEquals("FINANCE_REVIEW", result.getDecision());
        assertEquals(financeOfficer, application.getAssignedOfficer());
    }

    @Test
    public void routeApplication_routesStandard_forOrdinaryCase() {
        Application application = app(50, 50_000, PriorityLevel.LOW, false);
        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(userRepository.findLeastLoadedActiveUsersByRole(RoleType.ROLE_FIELD_OFFICER))
                .thenReturn(List.of(fieldOfficer));

        RoutingResponseDto result = routingService.routeApplication(1L);

        assertEquals("STANDARD", result.getDecision());
    }

    @Test
    public void routeApplication_flags_whenScoreBelowSuspiciousThreshold() {
        Application application = app(10, 50_000, PriorityLevel.MEDIUM, false);
        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));

        RoutingResponseDto result = routingService.routeApplication(1L);

        assertEquals("FLAGGED", result.getDecision());
        assertTrue(application.isFlagged());
        // No officer role lookup should happen for a flagged (suspicious) route
        verify(userRepository, never()).findLeastLoadedActiveUsersByRole(any());
    }

    @Test
    public void routeApplication_flags_whenPriorityIsCritical() {
        Application application = app(95, 50_000, PriorityLevel.CRITICAL, false);
        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));

        RoutingResponseDto result = routingService.routeApplication(1L);

        assertEquals("FLAGGED", result.getDecision());
        assertTrue(application.isFlagged());
    }

    @Test
    public void routeApplication_fallsBackToFlagged_whenNoOfficerAvailable() {
        Application application = app(50, 50_000, PriorityLevel.LOW, false);
        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(userRepository.findLeastLoadedActiveUsersByRole(RoleType.ROLE_FIELD_OFFICER))
                .thenReturn(Collections.emptyList());

        RoutingResponseDto result = routingService.routeApplication(1L);

        assertEquals("FLAGGED", result.getDecision());
        assertTrue(application.isFlagged());
        assertNull(application.getAssignedOfficer());
    }

    @Test
    public void routeApplication_throws_whenApplicationNotInRoutableState() {
        Application application = app(80, 50_000, PriorityLevel.MEDIUM, false);
        application.setWorkflowStatus(ApplicationStatus.APPROVED);
        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));

        assertThrows(InvalidWorkflowTransitionException.class,
                () -> routingService.routeApplication(1L));

        verify(applicationRepository, never()).save(any());
    }
}