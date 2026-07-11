package com.gov.subsidy.scheduler;

import com.gov.subsidy.service.ComplianceReminderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ComplianceReminderJob {
    private static final Logger log = LoggerFactory.getLogger(ComplianceReminderJob.class);

    private final ComplianceReminderService reminderService;

    public ComplianceReminderJob(ComplianceReminderService reminderService) {
        this.reminderService = reminderService;
    }

    @Scheduled(cron = "${compliance.reminder.cron:0 */15 * * * *}")
    public void scanAndSendReminders() {
        log.info("[COMPLIANCE-REMINDER-JOB] Starting scheduled compliance reminder scan...");
        try {
            int processedCount = reminderService.runAutoVerificationAndReminders();
            log.info("[COMPLIANCE-REMINDER-JOB] Scheduled scan complete. Reminders/actions processed: {}", processedCount);
        } catch (Exception e) {
            log.error("[COMPLIANCE-REMINDER-JOB] Error executing compliance reminder job", e);
        }
    }
}
