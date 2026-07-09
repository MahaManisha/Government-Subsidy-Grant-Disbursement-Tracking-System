package com.gov.subsidy.service;

import com.gov.subsidy.entity.Application;
import com.gov.subsidy.enums.WorkflowEvent;

/**
 * Notification service — placeholder interface.
 *
 * <p>This interface defines the contract for sending notifications
 * at each workflow stage transition. The current implementation is a
 * no-op stub that logs to the console. A real implementation would
 * integrate with email (JavaMail / SendGrid), SMS (Twilio), or
 * a government push-notification platform.</p>
 *
 * <p>Every method in this interface is safe to call even if the
 * notification infrastructure is unavailable — failures must never
 * block the main workflow transition.</p>
 */
public interface NotificationService {

    /**
     * Notify the beneficiary about a workflow event on their application.
     *
     * @param application the affected application
     * @param event       the event that triggered the notification
     * @param message     human-readable notification body
     */
    void notifyBeneficiary(Application application, WorkflowEvent event, String message);

    /**
     * Notify the assigned officer about a new or updated assignment.
     *
     * @param application the affected application
     * @param event       the event that triggered the notification
     * @param message     human-readable notification body
     */
    void notifyOfficer(Application application, WorkflowEvent event, String message);

    /**
     * Notify administrators about a critical workflow event
     * (e.g., SLA breach, suspicious flag).
     *
     * @param application the affected application
     * @param event       the event that triggered the notification
     * @param message     human-readable notification body
     */
    void notifyAdmin(Application application, WorkflowEvent event, String message);
}
