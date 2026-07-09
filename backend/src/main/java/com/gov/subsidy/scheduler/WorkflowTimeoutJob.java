package com.gov.subsidy.scheduler;

import com.gov.subsidy.config.WorkflowSlaConfig;
import com.gov.subsidy.entity.Application;
import com.gov.subsidy.enums.ApplicationStatus;
import com.gov.subsidy.enums.WorkflowStage;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.service.WorkflowAutomationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled job that scans all in-progress applications for SLA breaches
 * and triggers automatic timeout handling.
 *
 * <p>The job runs according to the cron expression configured in
 * {@code workflow.sla.timeout-scanner-cron} (default: every 30 minutes).
 * For each application that has been stuck in its current stage longer
 * than the configured SLA period, it calls
 * {@link WorkflowAutomationService#handleTimeout(Long)} which logs a
 * {@code SLA_BREACH_DETECTED} audit entry and auto-escalates.</p>
 *
 * <h3>SLA Periods (configurable via {@code workflow.sla.*})</h3>
 * <pre>
 *   INITIATION           — 24h
 *   FIELD_VERIFICATION   — 48h
 *   DISTRICT_REVIEW      — 72h
 *   FINANCE_REVIEW       — 96h
 *   RE_VERIFICATION      — 24h
 * </pre>
 */
@Component
public class WorkflowTimeoutJob {

    private static final Logger log = LoggerFactory.getLogger(WorkflowTimeoutJob.class);

    private final ApplicationRepository     applicationRepository;
    private final WorkflowAutomationService automationService;
    private final WorkflowSlaConfig         slaConfig;

    public WorkflowTimeoutJob(ApplicationRepository applicationRepository,
                               WorkflowAutomationService automationService,
                               WorkflowSlaConfig slaConfig) {
        this.applicationRepository = applicationRepository;
        this.automationService     = automationService;
        this.slaConfig             = slaConfig;
    }

    /**
     * Main SLA scanner — runs on the cron schedule from {@code workflow.sla.timeout-scanner-cron}.
     * Checks every in-progress application and escalates those that have exceeded their SLA.
     */
    @Scheduled(cron = "${workflow.sla.timeout-scanner-cron:0 */30 * * * *}")
    public void scanForSlaBreaches() {
        log.info("[SLA-SCANNER] Starting SLA breach scan at {}", LocalDateTime.now());

        int totalChecked  = 0;
        int breachesFound = 0;

        try {
            // Fetch all applications that are currently active
            List<Application> activeApplications = applicationRepository
                    .findByWorkflowStatus(ApplicationStatus.UNDER_REVIEW);
            activeApplications.addAll(applicationRepository
                    .findByWorkflowStatus(ApplicationStatus.RE_VERIFICATION_REQUESTED));
            activeApplications.addAll(applicationRepository
                    .findByWorkflowStatus(ApplicationStatus.SUBMITTED));

            for (Application app : activeApplications) {
                totalChecked++;
                try {
                    if (isSlaBreached(app)) {
                        breachesFound++;
                        log.warn("[SLA-SCANNER] SLA breach detected for App {} at stage {}",
                                app.getApplicationNumber(), app.getCurrentStage());
                        automationService.handleTimeout(app.getId());
                    }
                } catch (Exception ex) {
                    // Log per-application error but continue scanning others
                    log.error("[SLA-SCANNER] Error processing SLA timeout for App {}: {}",
                            app.getApplicationNumber(), ex.getMessage(), ex);
                }
            }
        } catch (Exception ex) {
            log.error("[SLA-SCANNER] Fatal error during SLA scan: {}", ex.getMessage(), ex);
        }

        log.info("[SLA-SCANNER] Scan complete. Checked: {}, Breaches found: {}",
                totalChecked, breachesFound);
    }

    /**
     * Determines whether the given application has exceeded the SLA for its current stage.
     *
     * @param app the application to check
     * @return {@code true} if the application has been in its current stage longer than allowed
     */
    private boolean isSlaBreached(Application app) {
        LocalDateTime reference = app.getLastModifiedDate() != null
                ? app.getLastModifiedDate()
                : app.getSubmittedDate();

        if (reference == null) return false;

        int slaHours = getSlaHoursForStage(app.getCurrentStage(),
                app.getWorkflowStatus() == ApplicationStatus.RE_VERIFICATION_REQUESTED);

        LocalDateTime deadline = reference.plusHours(slaHours);
        return LocalDateTime.now().isAfter(deadline);
    }

    /**
     * Returns the configured SLA in hours for the given workflow stage.
     *
     * @param stage           the current stage
     * @param isReVerification whether the application is in RE_VERIFICATION_REQUESTED state
     * @return SLA period in hours
     */
    private int getSlaHoursForStage(WorkflowStage stage, boolean isReVerification) {
        if (isReVerification) return slaConfig.getReVerificationHours();
        return switch (stage) {
            case INITIATION         -> slaConfig.getInitiationHours();
            case FIELD_VERIFICATION -> slaConfig.getFieldVerificationHours();
            case DISTRICT_REVIEW    -> slaConfig.getDistrictReviewHours();
            case FINANCE_REVIEW     -> slaConfig.getFinanceReviewHours();
            default                 -> Integer.MAX_VALUE; // COMPLETED, etc. — no SLA
        };
    }
}
