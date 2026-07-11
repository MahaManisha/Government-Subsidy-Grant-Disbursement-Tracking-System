package com.gov.subsidy.service.impl;

import com.gov.subsidy.dto.ComplianceReminderDto;
import com.gov.subsidy.entity.*;
import com.gov.subsidy.enums.ComplianceReminderType;
import com.gov.subsidy.enums.ComplianceStatus;
import com.gov.subsidy.enums.WorkflowEvent;
import com.gov.subsidy.mapper.ComplianceReminderMapper;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.AuditLogRepository;
import com.gov.subsidy.repository.ComplianceReminderRepository;
import com.gov.subsidy.repository.ComplianceRepository;
import com.gov.subsidy.service.ComplianceReminderService;
import com.gov.subsidy.service.EmailService;
import com.gov.subsidy.service.NotificationService;
import com.gov.subsidy.service.SmsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ComplianceReminderServiceImpl implements ComplianceReminderService {

    private final ComplianceRepository complianceRepository;
    private final ComplianceReminderRepository reminderRepository;
    private final ApplicationRepository applicationRepository;
    private final AuditLogRepository auditLogRepository;
    private final EmailService emailService;
    private final SmsService smsService;
    private final NotificationService notificationService;
    private final ComplianceReminderMapper reminderMapper;

    public ComplianceReminderServiceImpl(ComplianceRepository complianceRepository,
                                         ComplianceReminderRepository reminderRepository,
                                         ApplicationRepository applicationRepository,
                                         AuditLogRepository auditLogRepository,
                                         EmailService emailService,
                                         SmsService smsService,
                                         NotificationService notificationService,
                                         ComplianceReminderMapper reminderMapper) {
        this.complianceRepository = complianceRepository;
        this.reminderRepository = reminderRepository;
        this.applicationRepository = applicationRepository;
        this.auditLogRepository = auditLogRepository;
        this.emailService = emailService;
        this.smsService = smsService;
        this.notificationService = notificationService;
        this.reminderMapper = reminderMapper;
    }

    @Override
    public int runAutoVerificationAndReminders() {
        LocalDateTime now = LocalDateTime.now();
        int processedCount = 0;

        // 1. Scan for PENDING or UNDER_REVIEW compliance records
        List<Compliance> activeCompliances = complianceRepository.findAll().stream()
                .filter(c -> c.getStatus() == ComplianceStatus.PENDING || c.getStatus() == ComplianceStatus.UNDER_REVIEW)
                .collect(Collectors.toList());

        for (Compliance comp : activeCompliances) {
            if (comp.getNextDueDate() == null) {
                continue;
            }

            // A. Overdue Check: nextDueDate has passed
            if (comp.getNextDueDate().isBefore(now)) {
                comp.setStatus(ComplianceStatus.NON_COMPLIANT);
                complianceRepository.save(comp);

                // Update application progress
                Application app = comp.getApplication();
                app.setFlagged(true);
                app.setRemarks("Application flagged: Compliance check overdue for milestone " + comp.getMilestoneNumber());
                applicationRepository.save(app);

                // System Audit Log update
                AuditLog audit = AuditLog.builder()
                        .action("COMPLIANCE_NON_COMPLIANT")
                        .performedBy("SYSTEM")
                        .details("Application ID " + app.getId() + " flagged. Compliance milestone " + comp.getMilestoneNumber() + " is overdue.")
                        .timestamp(LocalDateTime.now())
                        .build();
                auditLogRepository.save(audit);

                // Send and save OVERDUE reminder
                sendReminderNotification(comp, ComplianceReminderType.OVERDUE,
                        "URGENT: Compliance verification for milestone " + comp.getMilestoneNumber() + " is OVERDUE since " + comp.getNextDueDate() + ". Your application has been flagged.");
                processedCount++;
            }
            
            // B. Due Soon Check: nextDueDate within next 3 days
            else if (comp.getNextDueDate().isBefore(now.plusDays(3)) && comp.getNextDueDate().isAfter(now)) {
                if (!reminderRepository.existsByComplianceIdAndReminderType(comp.getId(), ComplianceReminderType.DUE_SOON)) {
                    sendReminderNotification(comp, ComplianceReminderType.DUE_SOON,
                            "Reminder: Compliance verification for milestone " + comp.getMilestoneNumber() + " is due soon on " + comp.getNextDueDate() + ".");
                    processedCount++;
                }
            }
        }

        // 2. Scan for NON_COMPLIANT records to escalate overdue cases (e.g. > 3 days past nextDueDate)
        List<Compliance> nonCompliantCompliances = complianceRepository.findAll().stream()
                .filter(c -> c.getStatus() == ComplianceStatus.NON_COMPLIANT)
                .collect(Collectors.toList());

        for (Compliance comp : nonCompliantCompliances) {
            if (comp.getNextDueDate() != null && comp.getNextDueDate().plusDays(3).isBefore(now)) {
                if (!reminderRepository.existsByComplianceIdAndReminderType(comp.getId(), ComplianceReminderType.ESCALATED)) {
                    
                    // Audit Log update for escalation
                    AuditLog audit = AuditLog.builder()
                            .action("COMPLIANCE_ESCALATION")
                            .performedBy("SYSTEM")
                            .details("CRITICAL: Compliance milestone " + comp.getMilestoneNumber() + " remains unresolved for > 3 days past deadline.")
                            .timestamp(LocalDateTime.now())
                            .build();
                    auditLogRepository.save(audit);

                    // Escalate to officer and admin via dashboard notifications
                    notificationService.notifyAdmin(comp.getApplication(), WorkflowEvent.ESCALATION_TRIGGERED,
                            "CRITICAL: Application " + comp.getApplication().getApplicationNumber() + " compliance is critically overdue (>3 days past due date).");

                    sendReminderNotification(comp, ComplianceReminderType.ESCALATED,
                            "CRITICAL WARNING: Your compliance verification is severely overdue. Case escalated to administrative review.");
                    processedCount++;
                }
            }
        }

        return processedCount;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplianceReminderDto> getReminderHistory(Long complianceId) {
        return reminderRepository.findByComplianceId(complianceId).stream()
                .map(reminderMapper::toDto)
                .collect(Collectors.toList());
    }

    private void sendReminderNotification(Compliance comp, ComplianceReminderType type, String messageText) {
        User recipient = comp.getBeneficiary().getUser();

        // simulated SMS
        if (comp.getBeneficiary().getPhoneNumber() != null) {
            smsService.sendSms(comp.getBeneficiary().getPhoneNumber(), messageText);
        }

        // simulated Email
        if (recipient.getEmail() != null) {
            emailService.sendEmail(recipient.getEmail(), "Subsidy Compliance - " + type.name(), messageText);
        }

        // simulated Dashboard Notification
        notificationService.notifyBeneficiary(comp.getApplication(), WorkflowEvent.NOTIFICATION_SENT, messageText);

        // Save Reminder History
        ComplianceReminder reminder = ComplianceReminder.builder()
                .compliance(comp)
                .recipient(recipient)
                .reminderType(type)
                .sentVia("EMAIL, SMS, DASHBOARD")
                .sentAt(LocalDateTime.now())
                .message(messageText)
                .build();
        reminderRepository.save(reminder);
    }
}
