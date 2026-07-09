package com.gov.subsidy.service.impl;

import com.gov.subsidy.entity.Application;
import com.gov.subsidy.enums.WorkflowEvent;
import com.gov.subsidy.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * No-op placeholder implementation of {@link NotificationService}.
 *
 * <p>All methods log the notification intent to SLF4J at INFO level.
 * Replace this class with a real integration (JavaMail, Twilio, FCM, etc.)
 * when the notification infrastructure is ready.</p>
 *
 * <p><b>Integration notes for future implementers:</b>
 * <ul>
 *   <li>Email — inject {@code JavaMailSender} and call {@code send(MimeMessage)}</li>
 *   <li>SMS   — use Twilio SDK: {@code Message.creator(to, from, body).create()}</li>
 *   <li>Push  — call your government notification API via {@code RestTemplate}</li>
 * </ul>
 * Failures in any real implementation should be caught and logged — never
 * allowed to propagate up and roll back the workflow transaction.</p>
 */
@Service
public class NotificationServiceImpl implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationServiceImpl.class);

    @Override
    public void notifyBeneficiary(Application application, WorkflowEvent event, String message) {
        log.info("[NOTIFICATION-PLACEHOLDER] BENEFICIARY | App: {} | Event: {} | Message: {}",
                application.getApplicationNumber(), event, message);
        // TODO: Replace with real notification:
        // beneficiaryEmailService.send(application.getBeneficiary().getEmail(), subject, message);
    }

    @Override
    public void notifyOfficer(Application application, WorkflowEvent event, String message) {
        String officerInfo = application.getAssignedOfficer() == null
                ? "UNASSIGNED"
                : application.getAssignedOfficer().getUsername();
        log.info("[NOTIFICATION-PLACEHOLDER] OFFICER ({}) | App: {} | Event: {} | Message: {}",
                officerInfo, application.getApplicationNumber(), event, message);
        // TODO: Replace with real notification:
        // officerEmailService.send(application.getAssignedOfficer().getEmail(), subject, message);
    }

    @Override
    public void notifyAdmin(Application application, WorkflowEvent event, String message) {
        log.warn("[NOTIFICATION-PLACEHOLDER] ADMIN | App: {} | Event: {} | Message: {}",
                application.getApplicationNumber(), event, message);
        // TODO: Replace with real notification:
        // adminAlertService.sendCriticalAlert(applicationId, event, message);
    }
}
