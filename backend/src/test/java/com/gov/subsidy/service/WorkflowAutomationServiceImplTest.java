package com.gov.subsidy.service;

import com.gov.subsidy.dto.WorkflowAutomationResponseDto;
import com.gov.subsidy.entity.Application;
import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.entity.WorkflowAuditLog;
import com.gov.subsidy.enums.ApplicationStatus;
import com.gov.subsidy.enums.WorkflowStage;
import com.gov.subsidy.exception.InvalidWorkflowTransitionException;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.ApplicationMapper;
import com.gov.subsidy.repository.*;
import com.gov.subsidy.service.impl.WorkflowAutomationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link WorkflowAutomationServiceImpl} — the state-machine
 * engine that drives automatic stage progression
 * (INITIATION -> FIELD_VERIFICATION -> DISTRICT_REVIEW -> FINANCE_REVIEW -> COMPLETED)
 * plus escalation and re-verification side-paths.
 */
@ExtendWith(MockitoExtension.class)
public class WorkflowAutomationServiceImplTest {

    @Mock private ApplicationRepository applicationRepository;
    @Mock private VerificationRepository verificationRepository;
    @Mock private VerificationHistoryRepository verificationHistoryRepository;
    @Mock private WorkflowAuditLogRepository auditLogRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;
    @Mock private ApplicationMapper applicationMapper;

    private WorkflowAutomationServiceImpl workflowService;
    private Application application;

    @BeforeEach
    public void setUp() {
        workflowService = new WorkflowAutomationServiceImpl(applicationRepository, verificationRepository,
                verificationHistoryRepository, auditLogRepository, userRepository,
                notificationService, applicationMapper);

        Beneficiary beneficiary = Beneficiary.builder().id(5L).build();
        application = Application.builder()
                .id(1L)
                .applicationNumber("APP-2026-000001")
                .beneficiary(beneficiary)
                .workflowStatus(ApplicationStatus.SUBMITTED)
                .currentStage(WorkflowStage.INITIATION)
                .build();

        lenient().when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        lenient().when(applicationRepository.save(any(Application.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        lenient().when(auditLogRepository.save(any(WorkflowAuditLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        lenient().when(auditLogRepository.findByApplicationIdOrderByOccurredAtAsc(any()))
                .thenReturn(Collections.emptyList());
        // No verification record exists in these tests -> appendVerificationHistory() is a no-op
        lenient().when(verificationRepository.findByApplicationId(any())).thenReturn(Optional.empty());
    }

    @Test
    public void advanceWorkflow_movesFromInitiationToFieldVerification() {
        WorkflowAutomationResponseDto result = workflowService.advanceWorkflow(1L, "system");

        assertEquals(WorkflowStage.FIELD_VERIFICATION, application.getCurrentStage());
        assertEquals(ApplicationStatus.UNDER_REVIEW, application.getWorkflowStatus());
        assertEquals("AUTO_SUBMITTED", result.getEvent());
    }

    @Test
    public void advanceWorkflow_movesFromFieldVerificationToDistrictReview() {
        application.setCurrentStage(WorkflowStage.FIELD_VERIFICATION);
        application.setWorkflowStatus(ApplicationStatus.UNDER_REVIEW);

        workflowService.advanceWorkflow(1L, "system");

        assertEquals(WorkflowStage.DISTRICT_REVIEW, application.getCurrentStage());
    }

    @Test
    public void advanceWorkflow_movesFromDistrictReviewToFinanceReview() {
        application.setCurrentStage(WorkflowStage.DISTRICT_REVIEW);
        application.setWorkflowStatus(ApplicationStatus.UNDER_REVIEW);

        workflowService.advanceWorkflow(1L, "system");

        assertEquals(WorkflowStage.FINANCE_REVIEW, application.getCurrentStage());
    }

    @Test
    public void advanceWorkflow_approvesApplication_whenFinanceReviewCompletes() {
        application.setCurrentStage(WorkflowStage.FINANCE_REVIEW);
        application.setWorkflowStatus(ApplicationStatus.UNDER_REVIEW);

        workflowService.advanceWorkflow(1L, "system");

        assertEquals(WorkflowStage.COMPLETED, application.getCurrentStage());
        assertEquals(ApplicationStatus.APPROVED, application.getWorkflowStatus());
        assertNotNull(application.getApprovedDate());
    }

    @Test
    public void advanceWorkflow_throws_whenAlreadyAtCompletedStage() {
        application.setCurrentStage(WorkflowStage.COMPLETED);
        application.setWorkflowStatus(ApplicationStatus.APPROVED);

        assertThrows(InvalidWorkflowTransitionException.class,
                () -> workflowService.advanceWorkflow(1L, "system"));

        verify(applicationRepository, never()).save(any());
    }

    @Test
    public void advanceWorkflow_throws_whenApplicationNotFound() {
        when(applicationRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> workflowService.advanceWorkflow(99L, "system"));
    }

    @Test
    public void triggerEscalation_movesFieldVerificationToDistrictReview() {
        application.setCurrentStage(WorkflowStage.FIELD_VERIFICATION);

        workflowService.triggerEscalation(1L, "SLA breach");

        assertEquals(WorkflowStage.DISTRICT_REVIEW, application.getCurrentStage());
        assertEquals(ApplicationStatus.UNDER_REVIEW, application.getWorkflowStatus());
    }

    @Test
    public void triggerEscalation_movesDistrictReviewToFinanceReview() {
        application.setCurrentStage(WorkflowStage.DISTRICT_REVIEW);

        workflowService.triggerEscalation(1L, "Manual escalation");

        assertEquals(WorkflowStage.FINANCE_REVIEW, application.getCurrentStage());
    }

    @Test
    public void triggerEscalation_throws_whenAlreadyAtMaximumReviewLevel() {
        application.setCurrentStage(WorkflowStage.FINANCE_REVIEW);

        assertThrows(InvalidWorkflowTransitionException.class,
                () -> workflowService.triggerEscalation(1L, "Cannot escalate further"));
    }

    @Test
    public void triggerReVerification_resetsApplicationToFieldVerification() {
        application.setCurrentStage(WorkflowStage.FINANCE_REVIEW);
        application.setWorkflowStatus(ApplicationStatus.UNDER_REVIEW);

        workflowService.triggerReVerification(1L, "Suspicious documents found");

        assertEquals(WorkflowStage.FIELD_VERIFICATION, application.getCurrentStage());
        assertEquals(ApplicationStatus.RE_VERIFICATION_REQUESTED, application.getWorkflowStatus());
        assertTrue(application.isReVerificationRequested());
    }
}