package com.gov.subsidy.service;

import com.gov.subsidy.dto.VerificationDto;
import com.gov.subsidy.entity.Application;
import com.gov.subsidy.entity.Disbursement;
import com.gov.subsidy.entity.Scheme;
import com.gov.subsidy.entity.User;
import com.gov.subsidy.entity.Verification;
import com.gov.subsidy.enums.ApplicationStatus;
import com.gov.subsidy.enums.WorkflowStage;
import com.gov.subsidy.exception.InvalidWorkflowTransitionException;
import com.gov.subsidy.mapper.VerificationMapper;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.DisbursementRepository;
import com.gov.subsidy.repository.UserRepository;
import com.gov.subsidy.repository.VerificationHistoryRepository;
import com.gov.subsidy.repository.VerificationRepository;
import com.gov.subsidy.repository.WorkflowAuditLogRepository;
import com.gov.subsidy.service.impl.VerificationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DisbursementReleaseTest {

    @Mock
    private ApplicationRepository applicationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private VerificationRepository verificationRepository;
    @Mock
    private VerificationHistoryRepository historyRepository;
    @Mock
    private VerificationMapper verificationMapper;
    @Mock
    private NotificationService notificationService;
    @Mock
    private WorkflowAuditLogRepository auditLogRepository;
    @Mock
    private DisbursementRepository disbursementRepository;

    private VerificationServiceImpl verificationService;
    private Application testApplication;
    private Scheme testScheme;
    private User testOfficer;
    private Verification testVerification;

    @BeforeEach
    void setUp() {
        verificationService = new VerificationServiceImpl(
                applicationRepository,
                userRepository,
                verificationRepository,
                historyRepository,
                verificationMapper,
                notificationService,
                auditLogRepository,
                disbursementRepository
        );

        testOfficer = User.builder()
                .id(1L)
                .username("finance_officer")
                .firstName("John")
                .build();

        testScheme = Scheme.builder()
                .id(1L)
                .name("Test Scheme")
                .budgetAllocation(new BigDecimal("100000.00"))
                .remainingBudget(new BigDecimal("100000.00"))
                .build();

        testApplication = Application.builder()
                .id(1L)
                .applicationNumber("APP-TEST-001")
                .workflowStatus(ApplicationStatus.FINANCE_APPROVED)
                .currentStage(WorkflowStage.FINANCE_REVIEW_PENDING)
                .scheme(testScheme)
                .requestedAmount(new BigDecimal("15000.00"))
                .approvedAmount(new BigDecimal("15000.00"))
                .build();

        testVerification = Verification.builder()
                .id(1L)
                .application(testApplication)
                .build();
    }

    @Test
    @DisplayName("Successful fund release deducts budget, sets status to DISBURSED, and persists Disbursement record")
    void testReleaseFunds_Success() {
        when(applicationRepository.findById(1L)).thenReturn(Optional.of(testApplication));
        when(verificationRepository.findByApplicationId(1L)).thenReturn(Optional.of(testVerification));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testOfficer));
        when(historyRepository.findByVerificationIdOrderByActionDateAsc(any())).thenReturn(Collections.emptyList());

        verificationService.releaseFunds(1L, 1L);

        // Verify Application state update
        assertThat(testApplication.getWorkflowStatus()).isEqualTo(ApplicationStatus.DISBURSED);
        assertThat(testApplication.getCurrentStage()).isEqualTo(WorkflowStage.COMPLETED);

        // Verify Scheme budget deduction
        assertThat(testScheme.getRemainingBudget()).isEqualByComparingTo("85000.00");

        // Verify Disbursement record is created
        ArgumentCaptor<Disbursement> disbursementCaptor = ArgumentCaptor.forClass(Disbursement.class);
        verify(disbursementRepository, times(1)).save(disbursementCaptor.capture());
        
        Disbursement savedDisbursement = disbursementCaptor.getValue();
        assertThat(savedDisbursement.getAmount()).isEqualByComparingTo("15000.00");
        assertThat(savedDisbursement.getTransactionId()).startsWith("TXN-");
        assertThat(savedDisbursement.getFinanceOfficer()).isEqualTo(testOfficer);
        assertThat(savedDisbursement.getApplication()).isEqualTo(testApplication);
    }

    @Test
    @DisplayName("Double release throws InvalidWorkflowTransitionException safely")
    void testReleaseFunds_AlreadyDisbursed_ThrowsException() {
        testApplication.setWorkflowStatus(ApplicationStatus.DISBURSED);
        when(applicationRepository.findById(1L)).thenReturn(Optional.of(testApplication));
        when(verificationRepository.findByApplicationId(1L)).thenReturn(Optional.of(testVerification));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testOfficer));

        assertThatThrownBy(() -> verificationService.releaseFunds(1L, 1L))
                .isInstanceOf(InvalidWorkflowTransitionException.class)
                .hasMessageContaining("already been disbursed. Duplicate fund release is prohibited.");
    }

    @Test
    @DisplayName("Insufficient scheme budget throws IllegalArgumentException")
    void testReleaseFunds_InsufficientBudget_ThrowsException() {
        testScheme.setRemainingBudget(new BigDecimal("10000.00")); // Budget is 10k, but approved amount is 15k
        when(applicationRepository.findById(1L)).thenReturn(Optional.of(testApplication));
        when(verificationRepository.findByApplicationId(1L)).thenReturn(Optional.of(testVerification));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testOfficer));

        assertThatThrownBy(() -> verificationService.releaseFunds(1L, 1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Insufficient scheme budget");
    }
}
