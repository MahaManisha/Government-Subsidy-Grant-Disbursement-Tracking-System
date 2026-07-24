package com.gov.subsidy.service;

import com.gov.subsidy.dto.AssignOfficerRequestDto;
import com.gov.subsidy.dto.VerificationActionRequestDto;
import com.gov.subsidy.dto.VerificationDto;
import com.gov.subsidy.entity.Application;
import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.entity.User;
import com.gov.subsidy.entity.Verification;
import com.gov.subsidy.enums.ApplicationStatus;
import com.gov.subsidy.enums.VerificationStatus;
import com.gov.subsidy.enums.WorkflowStage;
import com.gov.subsidy.exception.DuplicateResourceException;
import com.gov.subsidy.exception.InvalidWorkflowTransitionException;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.VerificationMapper;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.UserRepository;
import com.gov.subsidy.repository.VerificationHistoryRepository;
import com.gov.subsidy.repository.VerificationRepository;
import com.gov.subsidy.service.impl.VerificationServiceImpl;
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
 * Unit tests for {@link VerificationServiceImpl} — the multi-level
 * field/district/finance verification workflow described in Module 2.
 */
@ExtendWith(MockitoExtension.class)
public class VerificationServiceImplTest {

    @Mock private ApplicationRepository applicationRepository;
    @Mock private UserRepository userRepository;
    @Mock private VerificationRepository verificationRepository;
    @Mock private VerificationHistoryRepository historyRepository;
    @Mock private VerificationMapper verificationMapper;

    private VerificationServiceImpl verificationService;

    private Application application;
    private User fieldOfficer;

    @BeforeEach
    public void setUp() {
        verificationService = new VerificationServiceImpl(applicationRepository, userRepository,
                verificationRepository, historyRepository, verificationMapper);

        Beneficiary beneficiary = Beneficiary.builder().id(5L).build();
        fieldOfficer = User.builder().id(10L).username("field1").build();
        application = Application.builder()
                .id(1L)
                .applicationNumber("APP-2026-000001")
                .beneficiary(beneficiary)
                .workflowStatus(ApplicationStatus.SUBMITTED)
                .currentStage(WorkflowStage.INITIATION)
                .build();

        lenient().when(historyRepository.findByVerificationIdOrderByActionDateAsc(any()))
                .thenReturn(Collections.emptyList());
        lenient().when(historyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(applicationRepository.save(any(Application.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    // ---------------------------------------------------------------------
    // Step 1: assignFieldOfficer
    // ---------------------------------------------------------------------

    @Test
    public void assignFieldOfficer_succeeds_whenApplicationIsSubmitted() {
        AssignOfficerRequestDto request = AssignOfficerRequestDto.builder()
                .fieldOfficerId(10L).remarks("Initial assignment").build();

        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(verificationRepository.existsByApplicationId(1L)).thenReturn(false);
        when(userRepository.findById(10L)).thenReturn(Optional.of(fieldOfficer));
        when(verificationRepository.save(any(Verification.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        verificationService.assignFieldOfficer(1L, request);

        assertEquals(ApplicationStatus.UNDER_REVIEW, application.getWorkflowStatus());
        assertEquals(WorkflowStage.FIELD_VERIFICATION, application.getCurrentStage());
        assertEquals(fieldOfficer, application.getAssignedOfficer());
        verify(verificationRepository, times(1)).save(any(Verification.class));
    }

    @Test
    public void assignFieldOfficer_throws_whenApplicationNotSubmitted() {
        application.setWorkflowStatus(ApplicationStatus.UNDER_REVIEW);
        AssignOfficerRequestDto request = AssignOfficerRequestDto.builder().fieldOfficerId(10L).build();
        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));

        assertThrows(InvalidWorkflowTransitionException.class,
                () -> verificationService.assignFieldOfficer(1L, request));
    }

    @Test
    public void assignFieldOfficer_throws_whenVerificationAlreadyExists() {
        AssignOfficerRequestDto request = AssignOfficerRequestDto.builder().fieldOfficerId(10L).build();
        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(verificationRepository.existsByApplicationId(1L)).thenReturn(true);

        assertThrows(DuplicateResourceException.class,
                () -> verificationService.assignFieldOfficer(1L, request));
    }

    // ---------------------------------------------------------------------
    // Step 2: performFieldVerification
    // ---------------------------------------------------------------------

    private Verification existingVerification() {
        return Verification.builder()
                .id(50L).application(application).fieldOfficer(fieldOfficer)
                .status(VerificationStatus.PENDING).build();
    }

    @Test
    public void performFieldVerification_approve_advancesToDistrictReview() {
        application.setCurrentStage(WorkflowStage.FIELD_VERIFICATION);
        Verification verification = existingVerification();
        VerificationActionRequestDto request = VerificationActionRequestDto.builder()
                .officerId(10L).action("APPROVE").remarks("All good").build();

        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(verificationRepository.findByApplicationId(1L)).thenReturn(Optional.of(verification));
        when(userRepository.findById(10L)).thenReturn(Optional.of(fieldOfficer));
        when(verificationRepository.save(any(Verification.class))).thenAnswer(inv -> inv.getArgument(0));

        verificationService.performFieldVerification(1L, request);

        assertEquals(WorkflowStage.DISTRICT_REVIEW, application.getCurrentStage());
        assertEquals(ApplicationStatus.UNDER_REVIEW, application.getWorkflowStatus());
        assertEquals(VerificationStatus.VERIFIED, verification.getStatus());
    }

    @Test
    public void performFieldVerification_reject_setsApplicationRejected() {
        application.setCurrentStage(WorkflowStage.FIELD_VERIFICATION);
        Verification verification = existingVerification();
        VerificationActionRequestDto request = VerificationActionRequestDto.builder()
                .officerId(10L).action("REJECT")
                .remarks("Documents fraudulent").rejectionReason("Fraud").build();

        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(verificationRepository.findByApplicationId(1L)).thenReturn(Optional.of(verification));
        when(userRepository.findById(10L)).thenReturn(Optional.of(fieldOfficer));
        when(verificationRepository.save(any(Verification.class))).thenAnswer(inv -> inv.getArgument(0));

        verificationService.performFieldVerification(1L, request);

        assertEquals(ApplicationStatus.REJECTED, application.getWorkflowStatus());
        assertTrue(application.isFlagged());
        assertEquals("Fraud", application.getRejectionReason());
    }

    @Test
    public void performFieldVerification_reject_throwsWithoutRemarks() {
        application.setCurrentStage(WorkflowStage.FIELD_VERIFICATION);
        Verification verification = existingVerification();
        VerificationActionRequestDto request = VerificationActionRequestDto.builder()
                .officerId(10L).action("REJECT").build(); // no remarks

        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(verificationRepository.findByApplicationId(1L)).thenReturn(Optional.of(verification));
        when(userRepository.findById(10L)).thenReturn(Optional.of(fieldOfficer));

        assertThrows(InvalidWorkflowTransitionException.class,
                () -> verificationService.performFieldVerification(1L, request));
    }

    @Test
    public void performFieldVerification_requestReverification_resetsToFieldVerification() {
        application.setCurrentStage(WorkflowStage.FIELD_VERIFICATION);
        Verification verification = existingVerification();
        VerificationActionRequestDto request = VerificationActionRequestDto.builder()
                .officerId(10L).action("REQUEST_REVERIFICATION")
                .remarks("Need more documents").build();

        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(verificationRepository.findByApplicationId(1L)).thenReturn(Optional.of(verification));
        when(userRepository.findById(10L)).thenReturn(Optional.of(fieldOfficer));
        when(verificationRepository.save(any(Verification.class))).thenAnswer(inv -> inv.getArgument(0));

        verificationService.performFieldVerification(1L, request);

        assertEquals(ApplicationStatus.RE_VERIFICATION_REQUESTED, application.getWorkflowStatus());
        assertEquals(WorkflowStage.FIELD_VERIFICATION, application.getCurrentStage());
        assertTrue(application.isReVerificationRequested());
    }

    @Test
    public void performFieldVerification_throws_whenWrongStage() {
        application.setCurrentStage(WorkflowStage.DISTRICT_REVIEW); // not FIELD_VERIFICATION
        Verification verification = existingVerification();
        VerificationActionRequestDto request = VerificationActionRequestDto.builder()
                .officerId(10L).action("APPROVE").build();

        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(verificationRepository.findByApplicationId(1L)).thenReturn(Optional.of(verification));
        when(userRepository.findById(10L)).thenReturn(Optional.of(fieldOfficer));

        assertThrows(InvalidWorkflowTransitionException.class,
                () -> verificationService.performFieldVerification(1L, request));
    }

    @Test
    public void getVerificationByApplicationId_throws_whenNoVerificationExists() {
        when(verificationRepository.findByApplicationId(1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> verificationService.getVerificationByApplicationId(1L));
    }
}