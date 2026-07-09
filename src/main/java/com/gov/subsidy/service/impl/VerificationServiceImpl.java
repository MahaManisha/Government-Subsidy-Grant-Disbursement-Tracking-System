package com.gov.subsidy.service.impl;

import com.gov.subsidy.dto.AssignOfficerRequestDto;
import com.gov.subsidy.dto.VerificationActionRequestDto;
import com.gov.subsidy.dto.VerificationDto;
import com.gov.subsidy.dto.VerificationHistoryDto;
import com.gov.subsidy.entity.Application;
import com.gov.subsidy.entity.User;
import com.gov.subsidy.entity.Verification;
import com.gov.subsidy.entity.VerificationHistory;
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
import com.gov.subsidy.service.VerificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implementation of the Verification Workflow.
 *
 * <p>Workflow state machine:
 * <pre>
 *   SUBMITTED (INITIATION)
 *     │  assignFieldOfficer()
 *     ▼
 *   UNDER_REVIEW (FIELD_VERIFICATION)
 *     │  performFieldVerification()
 *     ├──► APPROVE  → UNDER_REVIEW (DISTRICT_REVIEW)
 *     ├──► REJECT   → REJECTED
 *     └──► REQUEST_REVERIFICATION → RE_VERIFICATION_REQUESTED (FIELD_VERIFICATION)
 *
 *   UNDER_REVIEW (DISTRICT_REVIEW)
 *     │  performDistrictReview()
 *     ├──► APPROVE  → UNDER_REVIEW (FINANCE_REVIEW)
 *     ├──► REJECT   → REJECTED
 *     └──► REQUEST_REVERIFICATION → RE_VERIFICATION_REQUESTED (FIELD_VERIFICATION)
 *
 *   UNDER_REVIEW (FINANCE_REVIEW)
 *     │  performFinanceReview()
 *     ├──► APPROVE  → APPROVED (COMPLETED)
 *     ├──► REJECT   → REJECTED
 *     └──► REQUEST_REVERIFICATION → RE_VERIFICATION_REQUESTED (FIELD_VERIFICATION)
 * </pre>
 * </p>
 *
 * <p>Every transition appends a {@link VerificationHistory} record, giving a full audit trail.</p>
 */
@Service
@Transactional
public class VerificationServiceImpl implements VerificationService {

    private static final String ACTION_APPROVE               = "APPROVE";
    private static final String ACTION_REJECT                = "REJECT";
    private static final String ACTION_REQUEST_REVERIFICATION = "REQUEST_REVERIFICATION";

    private final ApplicationRepository       applicationRepository;
    private final UserRepository              userRepository;
    private final VerificationRepository      verificationRepository;
    private final VerificationHistoryRepository historyRepository;
    private final VerificationMapper          verificationMapper;

    public VerificationServiceImpl(ApplicationRepository applicationRepository,
                                    UserRepository userRepository,
                                    VerificationRepository verificationRepository,
                                    VerificationHistoryRepository historyRepository,
                                    VerificationMapper verificationMapper) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.verificationRepository = verificationRepository;
        this.historyRepository = historyRepository;
        this.verificationMapper = verificationMapper;
    }

    // =========================================================================
    // Step 1 – Assign Field Officer
    // =========================================================================

    @Override
    public VerificationDto assignFieldOfficer(Long applicationId, AssignOfficerRequestDto request) {

        Application application = loadApplication(applicationId);

        // Guard: must be SUBMITTED state
        if (application.getWorkflowStatus() != ApplicationStatus.SUBMITTED) {
            throw new InvalidWorkflowTransitionException(
                    "Cannot assign a field officer: application '" + application.getApplicationNumber() +
                    "' is in status " + application.getWorkflowStatus() +
                    ". Only SUBMITTED applications can be assigned.");
        }

        // Guard: no verification record should exist yet
        if (verificationRepository.existsByApplicationId(applicationId)) {
            throw new DuplicateResourceException(
                    "A verification record already exists for application: " +
                    application.getApplicationNumber());
        }

        User fieldOfficer = loadUser(request.getFieldOfficerId());

        // Create Verification record
        Verification verification = Verification.builder()
                .application(application)
                .fieldOfficer(fieldOfficer)
                .status(VerificationStatus.PENDING)
                .remarks(request.getRemarks())
                .build();
        verification = verificationRepository.save(verification);

        // Transition Application
        application.setWorkflowStatus(ApplicationStatus.UNDER_REVIEW);
        application.setCurrentStage(WorkflowStage.FIELD_VERIFICATION);
        application.setAssignedOfficer(fieldOfficer);
        application.setLastModifiedDate(LocalDateTime.now());
        applicationRepository.save(application);

        // Append history
        VerificationHistory history = buildHistory(verification, fieldOfficer,
                VerificationStatus.PENDING, "Field officer assigned. " + nullSafe(request.getRemarks()));
        historyRepository.save(history);

        return buildResponse(verification);
    }

    // =========================================================================
    // Step 2 – Field Verification
    // =========================================================================

    @Override
    public VerificationDto performFieldVerification(Long applicationId,
                                                     VerificationActionRequestDto request) {

        Application application = loadApplication(applicationId);
        Verification verification = loadVerification(applicationId);
        User officer = loadUser(request.getOfficerId());

        // Guard: must be FIELD_VERIFICATION stage
        if (application.getCurrentStage() != WorkflowStage.FIELD_VERIFICATION) {
            throw new InvalidWorkflowTransitionException(
                    "Application '" + application.getApplicationNumber() +
                    "' is at stage " + application.getCurrentStage() +
                    ". Field verification requires FIELD_VERIFICATION stage.");
        }

        String action = validateAction(request.getAction());

        switch (action) {
            case ACTION_APPROVE -> {
                verification.setStatus(VerificationStatus.VERIFIED);
                verification.setVerifiedDate(LocalDateTime.now());
                verification.setRemarks(request.getRemarks());
                application.setCurrentStage(WorkflowStage.DISTRICT_REVIEW);
                application.setWorkflowStatus(ApplicationStatus.UNDER_REVIEW);
                application.setVerifiedDate(LocalDateTime.now());
                application.setReVerificationRequested(false);
                appendHistory(verification, officer, VerificationStatus.VERIFIED,
                        "Field verification approved. " + nullSafe(request.getRemarks()));
            }
            case ACTION_REJECT -> {
                requireRemarks(request, "Rejection");
                verification.setStatus(VerificationStatus.REJECTED);
                verification.setRemarks(request.getRemarks());
                application.setWorkflowStatus(ApplicationStatus.REJECTED);
                application.setRejectionReason(request.getRejectionReason());
                application.setFlagged(true);
                appendHistory(verification, officer, VerificationStatus.REJECTED,
                        "Field verification rejected. " + nullSafe(request.getRemarks()));
            }
            case ACTION_REQUEST_REVERIFICATION -> {
                requireRemarks(request, "Re-verification request");
                verification.setStatus(VerificationStatus.RE_VERIFICATION_REQUESTED);
                verification.setRemarks(request.getRemarks());
                application.setWorkflowStatus(ApplicationStatus.RE_VERIFICATION_REQUESTED);
                application.setCurrentStage(WorkflowStage.FIELD_VERIFICATION);
                application.setReVerificationRequested(true);
                appendHistory(verification, officer, VerificationStatus.RE_VERIFICATION_REQUESTED,
                        "Re-verification requested. " + nullSafe(request.getRemarks()));
            }
        }

        application.setLastModifiedDate(LocalDateTime.now());
        verificationRepository.save(verification);
        applicationRepository.save(application);
        return buildResponse(verification);
    }

    // =========================================================================
    // Step 3 – District Officer Review
    // =========================================================================

    @Override
    public VerificationDto performDistrictReview(Long applicationId,
                                                  VerificationActionRequestDto request) {

        Application application = loadApplication(applicationId);
        Verification verification = loadVerification(applicationId);
        User officer = loadUser(request.getOfficerId());

        // Guard: must be DISTRICT_REVIEW stage
        if (application.getCurrentStage() != WorkflowStage.DISTRICT_REVIEW) {
            throw new InvalidWorkflowTransitionException(
                    "Application '" + application.getApplicationNumber() +
                    "' is at stage " + application.getCurrentStage() +
                    ". District review requires DISTRICT_REVIEW stage.");
        }

        String action = validateAction(request.getAction());

        switch (action) {
            case ACTION_APPROVE -> {
                verification.setStatus(VerificationStatus.VERIFIED);
                verification.setRemarks(request.getRemarks());
                application.setCurrentStage(WorkflowStage.FINANCE_REVIEW);
                application.setWorkflowStatus(ApplicationStatus.UNDER_REVIEW);
                application.setReVerificationRequested(false);
                appendHistory(verification, officer, VerificationStatus.VERIFIED,
                        "District review approved. Forwarded to Finance. " + nullSafe(request.getRemarks()));
            }
            case ACTION_REJECT -> {
                requireRemarks(request, "Rejection");
                verification.setStatus(VerificationStatus.REJECTED);
                verification.setRemarks(request.getRemarks());
                application.setWorkflowStatus(ApplicationStatus.REJECTED);
                application.setRejectionReason(request.getRejectionReason());
                application.setFlagged(true);
                appendHistory(verification, officer, VerificationStatus.REJECTED,
                        "District review rejected. " + nullSafe(request.getRemarks()));
            }
            case ACTION_REQUEST_REVERIFICATION -> {
                requireRemarks(request, "Re-verification request");
                verification.setStatus(VerificationStatus.RE_VERIFICATION_REQUESTED);
                verification.setRemarks(request.getRemarks());
                application.setWorkflowStatus(ApplicationStatus.RE_VERIFICATION_REQUESTED);
                application.setCurrentStage(WorkflowStage.FIELD_VERIFICATION);
                application.setReVerificationRequested(true);
                appendHistory(verification, officer, VerificationStatus.RE_VERIFICATION_REQUESTED,
                        "Sent back for field re-verification. " + nullSafe(request.getRemarks()));
            }
        }

        application.setLastModifiedDate(LocalDateTime.now());
        verificationRepository.save(verification);
        applicationRepository.save(application);
        return buildResponse(verification);
    }

    // =========================================================================
    // Step 4 – Finance Officer Review
    // =========================================================================

    @Override
    public VerificationDto performFinanceReview(Long applicationId,
                                                 VerificationActionRequestDto request) {

        Application application = loadApplication(applicationId);
        Verification verification = loadVerification(applicationId);
        User officer = loadUser(request.getOfficerId());

        // Guard: must be FINANCE_REVIEW stage
        if (application.getCurrentStage() != WorkflowStage.FINANCE_REVIEW) {
            throw new InvalidWorkflowTransitionException(
                    "Application '" + application.getApplicationNumber() +
                    "' is at stage " + application.getCurrentStage() +
                    ". Finance review requires FINANCE_REVIEW stage.");
        }

        String action = validateAction(request.getAction());

        switch (action) {
            case ACTION_APPROVE -> {
                verification.setStatus(VerificationStatus.VERIFIED);
                verification.setVerifiedDate(LocalDateTime.now());
                verification.setRemarks(request.getRemarks());
                application.setWorkflowStatus(ApplicationStatus.APPROVED);
                application.setCurrentStage(WorkflowStage.COMPLETED);
                application.setApprovedDate(LocalDateTime.now());
                application.setReVerificationRequested(false);
                appendHistory(verification, officer, VerificationStatus.VERIFIED,
                        "Finance review approved. Application fully approved. " + nullSafe(request.getRemarks()));
            }
            case ACTION_REJECT -> {
                requireRemarks(request, "Rejection");
                verification.setStatus(VerificationStatus.REJECTED);
                verification.setRemarks(request.getRemarks());
                application.setWorkflowStatus(ApplicationStatus.REJECTED);
                application.setRejectionReason(request.getRejectionReason());
                application.setFlagged(true);
                appendHistory(verification, officer, VerificationStatus.REJECTED,
                        "Finance review rejected. " + nullSafe(request.getRemarks()));
            }
            case ACTION_REQUEST_REVERIFICATION -> {
                requireRemarks(request, "Re-verification request");
                verification.setStatus(VerificationStatus.RE_VERIFICATION_REQUESTED);
                verification.setRemarks(request.getRemarks());
                application.setWorkflowStatus(ApplicationStatus.RE_VERIFICATION_REQUESTED);
                application.setCurrentStage(WorkflowStage.FIELD_VERIFICATION);
                application.setReVerificationRequested(true);
                appendHistory(verification, officer, VerificationStatus.RE_VERIFICATION_REQUESTED,
                        "Sent back for field re-verification from Finance. " + nullSafe(request.getRemarks()));
            }
        }

        application.setLastModifiedDate(LocalDateTime.now());
        verificationRepository.save(verification);
        applicationRepository.save(application);
        return buildResponse(verification);
    }

    // =========================================================================
    // Query Operations
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public VerificationDto getVerificationByApplicationId(Long applicationId) {
        Verification verification = loadVerification(applicationId);
        return buildResponse(verification);
    }

    @Override
    @Transactional(readOnly = true)
    public List<VerificationHistoryDto> getVerificationHistory(Long applicationId) {
        Verification verification = loadVerification(applicationId);
        return historyRepository
                .findByVerificationIdOrderByActionDateAsc(verification.getId())
                .stream()
                .map(verificationMapper::toHistoryDto)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // Private Helpers
    // =========================================================================

    private Application loadApplication(Long applicationId) {
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Application not found with ID: " + applicationId));
    }

    private User loadUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found with ID: " + userId));
    }

    private Verification loadVerification(Long applicationId) {
        return verificationRepository.findByApplicationId(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No verification record found for application ID: " + applicationId +
                        ". Please assign a field officer first (POST /v1/applications/{id}/assign-officer)."));
    }

    /**
     * Validate and normalise the action string; throw on unknown values.
     */
    private String validateAction(String action) {
        if (action == null) {
            throw new InvalidWorkflowTransitionException("Action must not be null.");
        }
        String upper = action.toUpperCase();
        if (!upper.equals(ACTION_APPROVE)
                && !upper.equals(ACTION_REJECT)
                && !upper.equals(ACTION_REQUEST_REVERIFICATION)) {
            throw new InvalidWorkflowTransitionException(
                    "Unknown action '" + action +
                    "'. Allowed values: APPROVE, REJECT, REQUEST_REVERIFICATION.");
        }
        return upper;
    }

    /**
     * Enforces that remarks are present for REJECT and REQUEST_REVERIFICATION actions.
     */
    private void requireRemarks(VerificationActionRequestDto request, String context) {
        if (request.getRemarks() == null || request.getRemarks().isBlank()) {
            throw new InvalidWorkflowTransitionException(
                    context + " requires non-empty remarks explaining the decision.");
        }
    }

    private void appendHistory(Verification verification, User officer,
                                VerificationStatus status, String remarks) {
        VerificationHistory entry = buildHistory(verification, officer, status, remarks);
        historyRepository.save(entry);
    }

    private VerificationHistory buildHistory(Verification verification, User officer,
                                              VerificationStatus status, String remarks) {
        return VerificationHistory.builder()
                .verification(verification)
                .officer(officer)
                .status(status)
                .remarks(remarks.length() > 500 ? remarks.substring(0, 500) : remarks)
                .actionDate(LocalDateTime.now())
                .build();
    }

    private VerificationDto buildResponse(Verification verification) {
        List<VerificationHistory> history = historyRepository
                .findByVerificationIdOrderByActionDateAsc(verification.getId());
        return verificationMapper.toDto(verification, history);
    }

    private String nullSafe(String value) {
        return value == null ? "" : value.trim();
    }
}
