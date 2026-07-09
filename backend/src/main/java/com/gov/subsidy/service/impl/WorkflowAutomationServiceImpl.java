package com.gov.subsidy.service.impl;

import com.gov.subsidy.dto.ApplicationDto;
import com.gov.subsidy.dto.WorkflowAuditLogDto;
import com.gov.subsidy.dto.WorkflowAutomationResponseDto;
import com.gov.subsidy.entity.Application;
import com.gov.subsidy.entity.User;
import com.gov.subsidy.entity.VerificationHistory;
import com.gov.subsidy.entity.WorkflowAuditLog;
import com.gov.subsidy.enums.*;
import com.gov.subsidy.exception.InvalidWorkflowTransitionException;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.ApplicationMapper;
import com.gov.subsidy.repository.*;
import com.gov.subsidy.service.NotificationService;
import com.gov.subsidy.service.WorkflowAutomationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implementation of the Workflow Automation Engine.
 *
 * <p>Drives automatic stage progression, escalation, re-verification,
 * SLA timeout handling, and ready-for-disbursement marking.
 * Every operation appends to the {@link WorkflowAuditLog} table AND
 * to {@link com.gov.subsidy.entity.VerificationHistory} if a
 * Verification record exists for the application.</p>
 *
 * <p>Notification calls are wrapped in try/catch — a notification
 * failure will never roll back a workflow transaction.</p>
 */
@Service
@Transactional
public class WorkflowAutomationServiceImpl implements WorkflowAutomationService {

    private static final Logger log = LoggerFactory.getLogger(WorkflowAutomationServiceImpl.class);
    private static final String SYSTEM_ACTOR = "SYSTEM";

    private final ApplicationRepository        applicationRepository;
    private final VerificationRepository       verificationRepository;
    private final VerificationHistoryRepository verificationHistoryRepository;
    private final WorkflowAuditLogRepository   auditLogRepository;
    private final UserRepository               userRepository;
    private final NotificationService          notificationService;
    private final ApplicationMapper            applicationMapper;

    public WorkflowAutomationServiceImpl(
            ApplicationRepository applicationRepository,
            VerificationRepository verificationRepository,
            VerificationHistoryRepository verificationHistoryRepository,
            WorkflowAuditLogRepository auditLogRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            ApplicationMapper applicationMapper) {
        this.applicationRepository        = applicationRepository;
        this.verificationRepository       = verificationRepository;
        this.verificationHistoryRepository = verificationHistoryRepository;
        this.auditLogRepository           = auditLogRepository;
        this.userRepository               = userRepository;
        this.notificationService          = notificationService;
        this.applicationMapper            = applicationMapper;
    }

    // =========================================================================
    // 1. ADVANCE WORKFLOW
    // =========================================================================

    @Override
    public WorkflowAutomationResponseDto advanceWorkflow(Long applicationId, String actorUsername) {

        Application app = loadApplication(applicationId);
        WorkflowStage   fromStage  = app.getCurrentStage();
        ApplicationStatus fromStatus = app.getWorkflowStatus();

        WorkflowStage     toStage;
        ApplicationStatus toStatus;
        WorkflowEvent     event;
        String            description;

        switch (fromStage) {
            case INITIATION -> {
                toStage     = WorkflowStage.FIELD_VERIFICATION;
                toStatus    = ApplicationStatus.UNDER_REVIEW;
                event       = WorkflowEvent.AUTO_SUBMITTED;
                description = "Application moved from INITIATION to FIELD_VERIFICATION. " +
                              "Awaiting field officer on-site verification.";
            }
            case FIELD_VERIFICATION -> {
                toStage     = WorkflowStage.DISTRICT_REVIEW;
                toStatus    = ApplicationStatus.UNDER_REVIEW;
                event       = WorkflowEvent.AUTO_FIELD_VERIFIED;
                description = "Field verification complete. Advancing to DISTRICT_REVIEW.";
            }
            case DISTRICT_REVIEW -> {
                toStage     = WorkflowStage.FINANCE_REVIEW;
                toStatus    = ApplicationStatus.UNDER_REVIEW;
                event       = WorkflowEvent.AUTO_DISTRICT_APPROVED;
                description = "District review complete. Advancing to FINANCE_REVIEW.";
            }
            case FINANCE_REVIEW -> {
                toStage     = WorkflowStage.COMPLETED;
                toStatus    = ApplicationStatus.APPROVED;
                event       = WorkflowEvent.AUTO_FINANCE_APPROVED;
                description = "Finance review complete. Application APPROVED. " +
                              "Ready to be marked for disbursement.";
            }
            default -> throw new InvalidWorkflowTransitionException(
                    "Cannot auto-advance application '" + app.getApplicationNumber() +
                    "' from stage " + fromStage + ". Use markReadyForDisbursement() for COMPLETED stage.");
        }

        // ── Update application ────────────────────────────────────────────────
        app.setCurrentStage(toStage);
        app.setWorkflowStatus(toStatus);
        app.setLastModifiedDate(LocalDateTime.now());
        if (toStatus == ApplicationStatus.APPROVED) {
            app.setApprovedDate(LocalDateTime.now());
        }
        applicationRepository.save(app);

        // ── Persist audit log ─────────────────────────────────────────────────
        WorkflowAuditLog auditLog = appendAuditLog(app, event,
                fromStatus, toStatus, fromStage, toStage,
                actorUsername, description, null, true);

        // ── Update VerificationHistory if applicable ──────────────────────────
        appendVerificationHistory(app, actorUsername, VerificationStatus.VERIFIED, description);

        // ── Notifications (non-blocking) ──────────────────────────────────────
        fireNotification(() -> notificationService.notifyBeneficiary(app, event,
                "Your application " + app.getApplicationNumber() + " has advanced to stage: " + toStage.name()));
        fireNotification(() -> notificationService.notifyOfficer(app, event,
                "Application " + app.getApplicationNumber() + " is now at " + toStage.name() + ". Please review."));

        log.info("[WORKFLOW] Advanced App {} | {} → {} | {} → {}",
                app.getApplicationNumber(), fromStage, toStage, fromStatus, toStatus);

        return buildResponse(event, description, app, app.getId());
    }

    // =========================================================================
    // 2. TRIGGER ESCALATION
    // =========================================================================

    @Override
    public WorkflowAutomationResponseDto triggerEscalation(Long applicationId, String reason) {

        Application app = loadApplication(applicationId);
        WorkflowStage fromStage = app.getCurrentStage();
        ApplicationStatus fromStatus = app.getWorkflowStatus();

        // Determine escalation target
        WorkflowStage toStage = switch (fromStage) {
            case INITIATION, FIELD_VERIFICATION -> WorkflowStage.DISTRICT_REVIEW;
            case DISTRICT_REVIEW                -> WorkflowStage.FINANCE_REVIEW;
            default -> throw new InvalidWorkflowTransitionException(
                    "Cannot escalate application '" + app.getApplicationNumber() +
                    "' from stage " + fromStage + " — already at maximum review level.");
        };

        String description = String.format(
                "ESCALATION triggered from %s → %s. Reason: %s", fromStage, toStage, reason);

        app.setCurrentStage(toStage);
        app.setWorkflowStatus(ApplicationStatus.UNDER_REVIEW);
        app.setLastModifiedDate(LocalDateTime.now());
        applicationRepository.save(app);

        appendAuditLog(app, WorkflowEvent.ESCALATION_TRIGGERED,
                fromStatus, ApplicationStatus.UNDER_REVIEW, fromStage, toStage,
                SYSTEM_ACTOR, description, null, true);

        appendVerificationHistory(app, SYSTEM_ACTOR,
                VerificationStatus.RE_VERIFICATION_REQUESTED, description);

        fireNotification(() -> notificationService.notifyOfficer(app, WorkflowEvent.ESCALATION_TRIGGERED,
                "Application " + app.getApplicationNumber() + " has been escalated to " + toStage.name()));
        fireNotification(() -> notificationService.notifyAdmin(app, WorkflowEvent.ESCALATION_TRIGGERED,
                "ESCALATION: " + app.getApplicationNumber() + " moved to " + toStage.name() + ". Reason: " + reason));

        log.warn("[WORKFLOW] Escalated App {} | {} → {} | Reason: {}",
                app.getApplicationNumber(), fromStage, toStage, reason);

        return buildResponse(WorkflowEvent.ESCALATION_TRIGGERED, description, app, applicationId);
    }

    // =========================================================================
    // 3. TRIGGER RE-VERIFICATION
    // =========================================================================

    @Override
    public WorkflowAutomationResponseDto triggerReVerification(Long applicationId, String reason) {

        Application app = loadApplication(applicationId);
        WorkflowStage   fromStage  = app.getCurrentStage();
        ApplicationStatus fromStatus = app.getWorkflowStatus();

        String description = String.format(
                "RE-VERIFICATION triggered. Resetting from %s → FIELD_VERIFICATION. Reason: %s",
                fromStage, reason);

        app.setCurrentStage(WorkflowStage.FIELD_VERIFICATION);
        app.setWorkflowStatus(ApplicationStatus.RE_VERIFICATION_REQUESTED);
        app.setReVerificationRequested(true);
        app.setLastModifiedDate(LocalDateTime.now());
        applicationRepository.save(app);

        appendAuditLog(app, WorkflowEvent.REVERIFICATION_TRIGGERED,
                fromStatus, ApplicationStatus.RE_VERIFICATION_REQUESTED,
                fromStage, WorkflowStage.FIELD_VERIFICATION,
                SYSTEM_ACTOR, description, null, true);

        appendVerificationHistory(app, SYSTEM_ACTOR,
                VerificationStatus.RE_VERIFICATION_REQUESTED, description);

        fireNotification(() -> notificationService.notifyBeneficiary(app, WorkflowEvent.REVERIFICATION_TRIGGERED,
                "Your application " + app.getApplicationNumber() +
                " requires additional field verification. Our officer will contact you."));
        fireNotification(() -> notificationService.notifyOfficer(app, WorkflowEvent.REVERIFICATION_TRIGGERED,
                "Re-verification required for " + app.getApplicationNumber() + ". Please schedule a site visit."));

        log.info("[WORKFLOW] Re-verification triggered for App {} | Reason: {}",
                app.getApplicationNumber(), reason);

        return buildResponse(WorkflowEvent.REVERIFICATION_TRIGGERED, description, app, applicationId);
    }

    // =========================================================================
    // 4. HANDLE SLA TIMEOUT
    // =========================================================================

    @Override
    public WorkflowAutomationResponseDto handleTimeout(Long applicationId) {

        Application app = loadApplication(applicationId);
        WorkflowStage   fromStage  = app.getCurrentStage();
        ApplicationStatus fromStatus = app.getWorkflowStatus();

        long hoursStuck = computeHoursStuck(app);
        String breachDescription = String.format(
                "SLA BREACH: Application '%s' has been stuck at %s for %d hours. " +
                "Automatic escalation triggered.",
                app.getApplicationNumber(), fromStage, hoursStuck);

        // First record the SLA breach
        appendAuditLog(app, WorkflowEvent.SLA_BREACH_DETECTED,
                fromStatus, fromStatus, fromStage, fromStage,
                SYSTEM_ACTOR, breachDescription, hoursStuck, true);

        fireNotification(() -> notificationService.notifyAdmin(app, WorkflowEvent.SLA_BREACH_DETECTED,
                "SLA BREACH: " + app.getApplicationNumber() +
                " is " + hoursStuck + " hours overdue at " + fromStage));

        log.warn("[SLA-BREACH] App {} stuck at {} for {}h — auto-escalating",
                app.getApplicationNumber(), fromStage, hoursStuck);

        // Auto-escalate
        return triggerEscalation(applicationId,
                "Auto-escalation after SLA breach of " + hoursStuck + " hours at " + fromStage);
    }

    // =========================================================================
    // 5. MARK READY FOR DISBURSEMENT
    // =========================================================================

    @Override
    public WorkflowAutomationResponseDto markReadyForDisbursement(Long applicationId) {

        Application app = loadApplication(applicationId);

        if (app.getWorkflowStatus() != ApplicationStatus.APPROVED) {
            throw new InvalidWorkflowTransitionException(
                    "Cannot mark application '" + app.getApplicationNumber() +
                    "' as READY_FOR_DISBURSEMENT: current status is " + app.getWorkflowStatus() +
                    ". Application must be APPROVED first.");
        }

        ApplicationStatus fromStatus = app.getWorkflowStatus();
        WorkflowStage fromStage = app.getCurrentStage();

        String description = "Application " + app.getApplicationNumber() +
                " is APPROVED and marked READY_FOR_DISBURSEMENT. " +
                "Awaiting fund transfer by the Disbursement module.";

        app.setWorkflowStatus(ApplicationStatus.READY_FOR_DISBURSEMENT);
        app.setCurrentStage(WorkflowStage.COMPLETED);
        app.setLastModifiedDate(LocalDateTime.now());
        applicationRepository.save(app);

        appendAuditLog(app, WorkflowEvent.AUTO_READY_FOR_DISBURSEMENT,
                fromStatus, ApplicationStatus.READY_FOR_DISBURSEMENT,
                fromStage, WorkflowStage.COMPLETED,
                SYSTEM_ACTOR, description, null, true);

        appendVerificationHistory(app, SYSTEM_ACTOR,
                VerificationStatus.VERIFIED, description);

        fireNotification(() -> notificationService.notifyBeneficiary(app,
                WorkflowEvent.AUTO_READY_FOR_DISBURSEMENT,
                "Congratulations! Your application " + app.getApplicationNumber() +
                " has been approved and is ready for fund disbursement."));

        log.info("[WORKFLOW] App {} is now READY_FOR_DISBURSEMENT", app.getApplicationNumber());

        return buildResponse(WorkflowEvent.AUTO_READY_FOR_DISBURSEMENT, description, app, applicationId);
    }

    // =========================================================================
    // 6. GET AUDIT TRAIL
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<WorkflowAuditLogDto> getAuditTrail(Long applicationId) {
        if (!applicationRepository.existsById(applicationId)) {
            throw new ResourceNotFoundException("Application not found with ID: " + applicationId);
        }
        return auditLogRepository.findByApplicationIdOrderByOccurredAtAsc(applicationId)
                .stream()
                .map(this::toAuditLogDto)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    private Application loadApplication(Long id) {
        return applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Application not found with ID: " + id));
    }

    private WorkflowAuditLog appendAuditLog(Application app,
                                             WorkflowEvent event,
                                             ApplicationStatus fromStatus,
                                             ApplicationStatus toStatus,
                                             WorkflowStage fromStage,
                                             WorkflowStage toStage,
                                             String actor,
                                             String description,
                                             Long slaBreachHours,
                                             boolean automated) {
        WorkflowAuditLog entry = WorkflowAuditLog.builder()
                .application(app)
                .event(event)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .fromStage(fromStage)
                .toStage(toStage)
                .actor(actor)
                .description(description)
                .slaBreachHours(slaBreachHours)
                .automated(automated)
                .occurredAt(LocalDateTime.now())
                .build();
        return auditLogRepository.save(entry);
    }

    /**
     * If a Verification record exists for the application, appends a new
     * VerificationHistory entry so both audit systems stay in sync.
     */
    private void appendVerificationHistory(Application app, String actor,
                                            VerificationStatus status, String remarks) {
        verificationRepository.findByApplicationId(app.getId()).ifPresent(verification -> {
            // Try to resolve officer — fall back to null if actor is "SYSTEM"
            User officer = null;
            if (!SYSTEM_ACTOR.equals(actor)) {
                officer = userRepository.findByUsername(actor).orElse(null);
            }
            if (officer == null) {
                // Use field officer as fallback actor for system-generated entries
                officer = verification.getFieldOfficer();
            }
            if (officer != null) {
                VerificationHistory history = VerificationHistory.builder()
                        .verification(verification)
                        .officer(officer)
                        .status(status)
                        .remarks(truncate("[AUTO] " + remarks, 500))
                        .actionDate(LocalDateTime.now())
                        .build();
                verificationHistoryRepository.save(history);
            }
        });
    }

    private WorkflowAutomationResponseDto buildResponse(WorkflowEvent event,
                                                         String summary,
                                                         Application app,
                                                         Long applicationId) {
        List<WorkflowAuditLogDto> trail = auditLogRepository
                .findByApplicationIdOrderByOccurredAtAsc(applicationId)
                .stream()
                .map(this::toAuditLogDto)
                .collect(Collectors.toList());

        return WorkflowAutomationResponseDto.builder()
                .event(event.name())
                .summary(summary)
                .application(applicationMapper.toDto(app))
                .auditTrail(trail)
                .build();
    }

    private WorkflowAuditLogDto toAuditLogDto(WorkflowAuditLog e) {
        return WorkflowAuditLogDto.builder()
                .id(e.getId())
                .applicationId(e.getApplication().getId())
                .applicationNumber(e.getApplication().getApplicationNumber())
                .event(e.getEvent().name())
                .fromStatus(e.getFromStatus() == null ? null : e.getFromStatus().name())
                .toStatus(e.getToStatus() == null ? null : e.getToStatus().name())
                .fromStage(e.getFromStage() == null ? null : e.getFromStage().name())
                .toStage(e.getToStage() == null ? null : e.getToStage().name())
                .actor(e.getActor())
                .description(e.getDescription())
                .slaBreachHours(e.getSlaBreachHours())
                .automated(e.isAutomated())
                .occurredAt(e.getOccurredAt())
                .build();
    }

    private long computeHoursStuck(Application app) {
        LocalDateTime ref = app.getLastModifiedDate() != null
                ? app.getLastModifiedDate() : app.getSubmittedDate();
        if (ref == null) return 0L;
        return java.time.Duration.between(ref, LocalDateTime.now()).toHours();
    }

    private String truncate(String s, int max) {
        return s == null ? null : (s.length() > max ? s.substring(0, max) : s);
    }

    /**
     * Fires a notification in a try/catch so a notification failure
     * can never roll back the enclosing workflow transaction.
     */
    private void fireNotification(Runnable task) {
        try {
            task.run();
        } catch (Exception ex) {
            log.error("[NOTIFICATION] Failed to send notification: {}", ex.getMessage(), ex);
        }
    }
}
