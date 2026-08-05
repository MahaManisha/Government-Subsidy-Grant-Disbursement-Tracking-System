package com.gov.subsidy.service.impl;

import com.gov.subsidy.config.RoutingConfig;
import com.gov.subsidy.dto.*;
import com.gov.subsidy.entity.Application;
import com.gov.subsidy.entity.RoutingRecord;
import com.gov.subsidy.entity.User;
import com.gov.subsidy.enums.*;
import com.gov.subsidy.exception.InvalidWorkflowTransitionException;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.ApplicationMapper;
import com.gov.subsidy.mapper.RoutingMapper;
import com.gov.subsidy.mapper.UserMapper;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.RoutingRecordRepository;
import com.gov.subsidy.repository.UserRepository;
import com.gov.subsidy.repository.VerificationRepository;
import com.gov.subsidy.repository.VerificationHistoryRepository;
import com.gov.subsidy.entity.Verification;
import com.gov.subsidy.entity.VerificationHistory;
import com.gov.subsidy.service.RoutingService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Implementation of the Approval Routing Engine.
 *
 * <h3>Auto-Routing Decision Tree</h3>
 * <pre>
 *  ┌─ isFlagged = true?                    ──► FLAGGED
 *  ├─ priority = CRITICAL?                 ──► FLAGGED
 *  ├─ score &lt; suspiciousScoreThreshold?    ──► FLAGGED
 *  ├─ score &gt;= fastTrackScore              ─┐
 *  │   AND amount &lt; highAmountThreshold    ─┘ ──► FAST_TRACK (field officer, expedited)
 *  ├─ amount &gt;= veryHighAmountThreshold   ──► FINANCE_REVIEW  (finance officer)
 *  ├─ amount &gt;= highAmountThreshold       ──► DISTRICT_REVIEW (district officer)
 *  └─ otherwise                           ──► STANDARD        (field officer)
 * </pre>
 *
 * <p>Officer selection uses load-balancing — the least-loaded active officer
 * with the required role is picked automatically via {@code findLeastLoadedActiveUsersByRole}.</p>
 *
 * <p>Every decision (automatic or manual) is persisted as a {@link RoutingRecord}
 * providing a complete, ordered audit trail.</p>
 */
@Service
@Transactional
public class RoutingServiceImpl implements RoutingService {

    private final ApplicationRepository    applicationRepository;
    private final UserRepository           userRepository;
    private final RoutingRecordRepository  routingRecordRepository;
    private final RoutingConfig            routingConfig;
    private final ApplicationMapper        applicationMapper;
    private final RoutingMapper            routingMapper;
    private final UserMapper               userMapper;
    private final VerificationRepository   verificationRepository;
    private final VerificationHistoryRepository verificationHistoryRepository;

    public RoutingServiceImpl(ApplicationRepository applicationRepository,
                               UserRepository userRepository,
                               RoutingRecordRepository routingRecordRepository,
                               RoutingConfig routingConfig,
                               ApplicationMapper applicationMapper,
                               RoutingMapper routingMapper,
                               UserMapper userMapper,
                               VerificationRepository verificationRepository,
                               VerificationHistoryRepository verificationHistoryRepository) {
        this.applicationRepository   = applicationRepository;
        this.userRepository          = userRepository;
        this.routingRecordRepository = routingRecordRepository;
        this.routingConfig           = routingConfig;
        this.applicationMapper       = applicationMapper;
        this.routingMapper           = routingMapper;
        this.userMapper              = userMapper;
        this.verificationRepository  = verificationRepository;
        this.verificationHistoryRepository = verificationHistoryRepository;
    }

    // =========================================================================
    // 1. AUTO-ROUTE
    // =========================================================================

    @Override
    public RoutingResponseDto routeApplication(Long applicationId) {

        Application app = loadApplication(applicationId);

        // Guard: only route SUBMITTED or UNDER_REVIEW applications
        if (app.getWorkflowStatus() != ApplicationStatus.SUBMITTED
                && app.getWorkflowStatus() != ApplicationStatus.UNDER_REVIEW) {
            throw new InvalidWorkflowTransitionException(
                    "Cannot route application '" + app.getApplicationNumber() +
                    "': status is " + app.getWorkflowStatus() +
                    ". Only SUBMITTED or UNDER_REVIEW applications can be routed.");
        }

        int     score  = app.getEligibilityScore() == null ? 0 : app.getEligibilityScore();
        BigDecimal amount = app.getRequestedAmount() == null ? BigDecimal.ZERO : app.getRequestedAmount();

        // ── Determine routing decision ─────────────────────────────────────────
        RoutingDecision decision;
        String          rationale;
        RoleType        targetRole = null;

        // Priority 1: Flag suspicious / CRITICAL priority
        if (app.isFlagged()) {
            decision  = RoutingDecision.FLAGGED;
            rationale = "Application is already flagged as suspicious. Routed to manual review.";
        } else if (app.getPriority() == PriorityLevel.CRITICAL) {
            decision  = RoutingDecision.FLAGGED;
            rationale = "CRITICAL priority detected. Flagged for urgent manual review.";
            app.setFlagged(true);
        } else if (score < routingConfig.getSuspiciousScoreThreshold()) {
            decision  = RoutingDecision.FLAGGED;
            rationale = String.format(
                    "Eligibility score %d is below suspicious threshold %d. Flagged for manual review.",
                    score, routingConfig.getSuspiciousScoreThreshold());
            app.setFlagged(true);
        }
        // Priority 2: Fast Track
        else if (score >= routingConfig.getFastTrackScoreThreshold()
                && amount.longValue() < routingConfig.getHighAmountThreshold()) {
            decision   = RoutingDecision.FAST_TRACK;
            targetRole = RoleType.ROLE_FIELD_OFFICER;
            rationale  = String.format(
                    "Score %d >= fast-track threshold %d and amount ₹%s < high threshold ₹%d. " +
                    "Fast-tracked to field officer.",
                    score, routingConfig.getFastTrackScoreThreshold(),
                    amount.toPlainString(), routingConfig.getHighAmountThreshold());
        }
        // Priority 3: Very high amount → Finance Officer
        else if (amount.longValue() >= routingConfig.getVeryHighAmountThreshold()) {
            decision   = RoutingDecision.FINANCE_REVIEW;
            targetRole = RoleType.ROLE_FINANCE_OFFICER;
            rationale  = String.format(
                    "Requested amount ₹%s >= very-high threshold ₹%d. " +
                    "Routed directly to Finance Officer.",
                    amount.toPlainString(), routingConfig.getVeryHighAmountThreshold());
        }
        // Priority 4: High amount → District Officer
        else if (amount.longValue() >= routingConfig.getHighAmountThreshold()) {
            decision   = RoutingDecision.DISTRICT_REVIEW;
            targetRole = RoleType.ROLE_DISTRICT_OFFICER;
            rationale  = String.format(
                    "Requested amount ₹%s >= high threshold ₹%d. " +
                    "Routed to District Officer for review.",
                    amount.toPlainString(), routingConfig.getHighAmountThreshold());
        }
        // Default: Standard → Field Officer
        else {
            decision   = RoutingDecision.STANDARD;
            targetRole = RoleType.ROLE_FIELD_OFFICER;
            rationale  = String.format(
                    "Standard routing: score %d, amount ₹%s. Assigned to field officer.",
                    score, amount.toPlainString());
        }

        // ── Select officer (load-balanced) ────────────────────────────────────
        User assignedOfficer = null;
        if (targetRole != null) {
            List<User> candidates = userRepository.findLeastLoadedActiveUsersByRole(targetRole);
            if (!candidates.isEmpty()) {
                assignedOfficer = candidates.get(0);
            } else {
                // No officer available — fall back to flagged
                decision  = RoutingDecision.FLAGGED;
                rationale = rationale + " WARNING: No active " + targetRole.name() +
                            " found. Application flagged for manual assignment.";
                app.setFlagged(true);
            }
        }

        // ── Update Application state ──────────────────────────────────────────
        app.setAssignedOfficer(assignedOfficer);
        app.setWorkflowStatus(ApplicationStatus.UNDER_REVIEW);
        app.setLastModifiedDate(LocalDateTime.now());

        // Advance stage for non-flagged decisions
        if (decision == RoutingDecision.FINANCE_REVIEW) {
            app.setCurrentStage(WorkflowStage.FINANCE_REVIEW);
        } else if (decision == RoutingDecision.DISTRICT_REVIEW) {
            app.setCurrentStage(WorkflowStage.DISTRICT_REVIEW);
        } else if (decision == RoutingDecision.FAST_TRACK || decision == RoutingDecision.STANDARD) {
            app.setCurrentStage(WorkflowStage.FIELD_VERIFICATION);
        }

        applicationRepository.save(app);

        // Ensure Verification record exists
        if (assignedOfficer != null) {
            ensureVerificationRecord(app, assignedOfficer, rationale);
        }

        // ── Persist routing record ─────────────────────────────────────────────
        RoutingRecord record = buildRecord(app, decision, assignedOfficer, null,
                score, amount, rationale, null, true);
        routingRecordRepository.save(record);

        return buildResponse(app, record);
    }

    // =========================================================================
    // 2. ESCALATE
    // =========================================================================

    @Override
    public RoutingResponseDto escalate(Long applicationId, EscalateRequestDto request) {

        Application app        = loadApplication(applicationId);
        User        actionedBy = loadUser(request.getActionedByOfficerId());

        // ── Determine next-level role based on current stage ──────────────────
        WorkflowStage currentStage = app.getCurrentStage();
        RoleType nextRole;
        WorkflowStage nextStage;
        String escalationContext;

        if (currentStage == WorkflowStage.FIELD_VERIFICATION
                || currentStage == WorkflowStage.INITIATION) {
            nextRole         = RoleType.ROLE_DISTRICT_OFFICER;
            nextStage        = WorkflowStage.DISTRICT_REVIEW;
            escalationContext = "FIELD_VERIFICATION → DISTRICT_REVIEW";
        } else if (currentStage == WorkflowStage.DISTRICT_REVIEW) {
            nextRole         = RoleType.ROLE_FINANCE_OFFICER;
            nextStage        = WorkflowStage.FINANCE_REVIEW;
            escalationContext = "DISTRICT_REVIEW → FINANCE_REVIEW";
        } else if (currentStage == WorkflowStage.FINANCE_REVIEW) {
            throw new InvalidWorkflowTransitionException(
                    "Cannot escalate: application '" + app.getApplicationNumber() +
                    "' is already at FINANCE_REVIEW (highest review level).");
        } else {
            throw new InvalidWorkflowTransitionException(
                    "Cannot escalate application '" + app.getApplicationNumber() +
                    "' from stage " + currentStage + ".");
        }

        // ── Select escalation target officer ──────────────────────────────────
        User escalateTo;
        if (request.getEscalateToOfficerId() != null) {
            escalateTo = loadUser(request.getEscalateToOfficerId());
        } else {
            List<User> candidates = userRepository.findLeastLoadedActiveUsersByRole(nextRole);
            if (candidates.isEmpty()) {
                throw new ResourceNotFoundException(
                        "No active officer found with role " + nextRole.name() +
                        " to escalate to. Please specify escalateToOfficerId.");
            }
            escalateTo = candidates.get(0);
        }

        String rationale = String.format(
                "Escalated by officer ID %d. Path: %s. Assigned to %s %s (ID %d). Reason: %s",
                actionedBy.getId(), escalationContext,
                escalateTo.getFirstName(), escalateTo.getLastName(), escalateTo.getId(),
                nullSafe(request.getRemarks()));

        // ── Update Application ────────────────────────────────────────────────
        app.setAssignedOfficer(escalateTo);
        app.setCurrentStage(nextStage);
        app.setWorkflowStatus(ApplicationStatus.UNDER_REVIEW);
        app.setLastModifiedDate(LocalDateTime.now());
        applicationRepository.save(app);
        
        if (escalateTo != null) {
            ensureVerificationRecord(app, escalateTo, rationale);
        }

        RoutingRecord record = buildRecord(app, RoutingDecision.ESCALATED, escalateTo, actionedBy,
                app.getEligibilityScore(), app.getRequestedAmount(), rationale, request.getRemarks(), false);
        routingRecordRepository.save(record);

        return buildResponse(app, record);
    }

    // =========================================================================
    // 3. REASSIGN
    // =========================================================================

    @Override
    public RoutingResponseDto reassign(Long applicationId, ReassignRequestDto request) {

        Application app        = loadApplication(applicationId);
        User        actionedBy = loadUser(request.getActionedByOfficerId());
        User        newOfficer = loadUser(request.getNewOfficerId());

        String rationale = String.format(
                "Reassigned by officer ID %d from %s to %s %s (ID %d). Reason: %s",
                actionedBy.getId(),
                app.getAssignedOfficer() == null ? "unassigned" :
                        app.getAssignedOfficer().getFirstName() + " " + app.getAssignedOfficer().getLastName(),
                newOfficer.getFirstName(), newOfficer.getLastName(), newOfficer.getId(),
                nullSafe(request.getRemarks()));

        // ── Update Application ────────────────────────────────────────────────
        app.setAssignedOfficer(newOfficer);
        app.setWorkflowStatus(ApplicationStatus.UNDER_REVIEW);
        app.setLastModifiedDate(LocalDateTime.now());
        applicationRepository.save(app);
        
        if (newOfficer != null) {
            ensureVerificationRecord(app, newOfficer, rationale);
        }

        RoutingRecord record = buildRecord(app, RoutingDecision.REASSIGNED, newOfficer, actionedBy,
                app.getEligibilityScore(), app.getRequestedAmount(), rationale, request.getRemarks(), false);
        routingRecordRepository.save(record);

        return buildResponse(app, record);
    }

    // =========================================================================
    // 4. FLAG SUSPICIOUS
    // =========================================================================

    @Override
    public RoutingResponseDto flagSuspicious(Long applicationId, FlagRequestDto request) {

        Application app        = loadApplication(applicationId);
        User        actionedBy = loadUser(request.getActionedByOfficerId());

        String rationale = String.format(
                "Manually flagged as suspicious by officer ID %d. Reason: %s",
                actionedBy.getId(), request.getReason());

        app.setFlagged(true);
        app.setLastModifiedDate(LocalDateTime.now());
        applicationRepository.save(app);

        RoutingRecord record = buildRecord(app, RoutingDecision.FLAGGED, null, actionedBy,
                app.getEligibilityScore(), app.getRequestedAmount(), rationale, request.getReason(), false);
        routingRecordRepository.save(record);

        return buildResponse(app, record);
    }

    // =========================================================================
    // 5. REJECT ROUTING
    // =========================================================================

    @Override
    public RoutingResponseDto rejectRouting(Long applicationId, VerificationActionRequestDto request) {

        Application app        = loadApplication(applicationId);
        User        actionedBy = loadUser(request.getOfficerId());

        if (request.getRemarks() == null || request.getRemarks().isBlank()) {
            throw new InvalidWorkflowTransitionException(
                    "Remarks are required when rejecting an application routing.");
        }

        String rationale = String.format(
                "Routing rejected by officer ID %d. Reason: %s",
                actionedBy.getId(), nullSafe(request.getRemarks()));

        app.setWorkflowStatus(ApplicationStatus.REJECTED);
        app.setRejectionReason(request.getRejectionReason() != null
                ? request.getRejectionReason() : request.getRemarks());
        app.setFlagged(true);
        app.setLastModifiedDate(LocalDateTime.now());
        applicationRepository.save(app);

        RoutingRecord record = buildRecord(app, RoutingDecision.REJECTED, null, actionedBy,
                app.getEligibilityScore(), app.getRequestedAmount(), rationale, request.getRemarks(), false);
        routingRecordRepository.save(record);

        return buildResponse(app, record);
    }

    // =========================================================================
    // 6. GET ROUTING HISTORY
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<RoutingRecordDto> getRoutingHistory(Long applicationId) {
        // Validate the application exists
        if (!applicationRepository.existsById(applicationId)) {
            throw new ResourceNotFoundException("Application not found with ID: " + applicationId);
        }
        List<RoutingRecord> records =
                routingRecordRepository.findByApplicationIdOrderByRoutedAtAsc(applicationId);
        return routingMapper.toDtoList(records);
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    private Application loadApplication(Long id) {
        return applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Application not found with ID: " + id));
    }

    private User loadUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found with ID: " + id));
    }

    private RoutingRecord buildRecord(Application app,
                                       RoutingDecision decision,
                                       User assignedTo,
                                       User actionedBy,
                                       Integer score,
                                       BigDecimal amount,
                                       String rationale,
                                       String remarks,
                                       boolean autoRouted) {
        return RoutingRecord.builder()
                .application(app)
                .decision(decision)
                .assignedTo(assignedTo)
                .actionedBy(actionedBy)
                .scoreAtRouting(score)
                .amountAtRouting(amount)
                .rationale(rationale)
                .remarks(remarks)
                .autoRouted(autoRouted)
                .routedAt(LocalDateTime.now())
                .build();
    }

    private RoutingResponseDto buildResponse(Application app, RoutingRecord latestRecord) {
        List<RoutingRecord> allRecords =
                routingRecordRepository.findByApplicationIdOrderByRoutedAtAsc(app.getId());

        return RoutingResponseDto.builder()
                .decision(latestRecord.getDecision().name())
                .assignedOfficer(userMapper.toDto(app.getAssignedOfficer()))
                .rationale(latestRecord.getRationale())
                .application(applicationMapper.toDto(app))
                .routingHistory(routingMapper.toDtoList(allRecords))
                .build();
    }

    private String nullSafe(String value) {
        return value == null ? "" : value.trim();
    }

    private void ensureVerificationRecord(Application app, User assignedOfficer, String remarks) {
        if (assignedOfficer == null) return;
        Verification verification = verificationRepository.findByApplicationId(app.getId()).orElse(null);
        if (verification == null) {
            verification = Verification.builder()
                    .application(app)
                    .fieldOfficer(assignedOfficer)
                    .status(VerificationStatus.PENDING)
                    .remarks(remarks != null && remarks.length() > 500 ? remarks.substring(0, 500) : remarks)
                    .build();
            verification = verificationRepository.save(verification);
            
            VerificationHistory history = VerificationHistory.builder()
                    .verification(verification)
                    .officer(assignedOfficer)
                    .status(VerificationStatus.PENDING)
                    .remarks("Verification workflow initiated. " + (remarks != null && remarks.length() > 400 ? remarks.substring(0, 400) : remarks))
                    .actionDate(LocalDateTime.now())
                    .build();
            verificationHistoryRepository.save(history);
        } else {
            verification.setFieldOfficer(assignedOfficer);
            verification.setStatus(VerificationStatus.PENDING);
            verification.setRemarks(remarks != null && remarks.length() > 500 ? remarks.substring(0, 500) : remarks);
            verificationRepository.save(verification);
            
            VerificationHistory history = VerificationHistory.builder()
                    .verification(verification)
                    .officer(assignedOfficer)
                    .status(VerificationStatus.PENDING)
                    .remarks("Verification workflow reassigned/escalated. " + (remarks != null && remarks.length() > 400 ? remarks.substring(0, 400) : remarks))
                    .actionDate(LocalDateTime.now())
                    .build();
            verificationHistoryRepository.save(history);
        }
    }
}
