package com.gov.subsidy.service;

import com.gov.subsidy.dto.ComplianceReminderDto;
import com.gov.subsidy.entity.*;
import com.gov.subsidy.enums.ApplicationStatus;
import com.gov.subsidy.enums.ComplianceReminderType;
import com.gov.subsidy.enums.ComplianceStatus;
import com.gov.subsidy.enums.WorkflowEvent;
import com.gov.subsidy.mapper.ComplianceReminderMapper;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.AuditLogRepository;
import com.gov.subsidy.repository.ComplianceReminderRepository;
import com.gov.subsidy.repository.ComplianceRepository;
import com.gov.subsidy.service.impl.ComplianceReminderServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ComplianceReminderServiceTest {

    @Mock
    private ComplianceRepository complianceRepository;

    @Mock
    private ComplianceReminderRepository reminderRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private SmsService smsService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private ComplianceReminderMapper reminderMapper;

    @InjectMocks
    private ComplianceReminderServiceImpl reminderService;

    private Compliance dueSoonCompliance;
    private Compliance overdueCompliance;
    private Compliance nonCompliantCompliance;
    private Application application;
    private Beneficiary beneficiary;
    private User beneficiaryUser;

    @BeforeEach
    public void setUp() {
        beneficiaryUser = User.builder().id(10L).username("beneficiary_citizen").email("citizen@example.com").build();
        beneficiary = Beneficiary.builder().id(5L).phoneNumber("+1234567890").user(beneficiaryUser).build();
        application = Application.builder()
                .id(1L)
                .applicationNumber("APP-2026-000001")
                .beneficiary(beneficiary)
                .workflowStatus(ApplicationStatus.APPROVED)
                .isFlagged(false)
                .build();

        dueSoonCompliance = Compliance.builder()
                .id(100L)
                .application(application)
                .beneficiary(beneficiary)
                .milestoneNumber(1)
                .status(ComplianceStatus.PENDING)
                .nextDueDate(LocalDateTime.now().plusDays(2)) // Approaching in 2 days
                .build();

        overdueCompliance = Compliance.builder()
                .id(101L)
                .application(application)
                .beneficiary(beneficiary)
                .milestoneNumber(1)
                .status(ComplianceStatus.PENDING)
                .nextDueDate(LocalDateTime.now().minusDays(1)) // Overdue by 1 day
                .build();

        nonCompliantCompliance = Compliance.builder()
                .id(102L)
                .application(application)
                .beneficiary(beneficiary)
                .milestoneNumber(2)
                .status(ComplianceStatus.NON_COMPLIANT)
                .nextDueDate(LocalDateTime.now().minusDays(4)) // Overdue by 4 days (>3 days)
                .build();
    }

    @Test
    public void testRunAutoVerification_DueSoonRemindsOnce() {
        when(complianceRepository.findAll()).thenReturn(Collections.singletonList(dueSoonCompliance));
        when(reminderRepository.existsByComplianceIdAndReminderType(100L, ComplianceReminderType.DUE_SOON)).thenReturn(false);

        int count = reminderService.runAutoVerificationAndReminders();

        assertEquals(1, count);
        verify(emailService, times(1)).sendEmail(eq("citizen@example.com"), contains("DUE_SOON"), anyString());
        verify(smsService, times(1)).sendSms(eq("+1234567890"), anyString());
        verify(notificationService, times(1)).notifyBeneficiary(eq(application), eq(WorkflowEvent.NOTIFICATION_SENT), anyString());
        verify(reminderRepository, times(1)).save(any(ComplianceReminder.class));
    }

    @Test
    public void testRunAutoVerification_OverdueTransitionsToNonCompliant() {
        when(complianceRepository.findAll()).thenReturn(Collections.singletonList(overdueCompliance));
        when(complianceRepository.save(any(Compliance.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(applicationRepository.save(any(Application.class))).thenAnswer(invocation -> invocation.getArgument(0));

        int count = reminderService.runAutoVerificationAndReminders();

        assertEquals(1, count);
        assertEquals(ComplianceStatus.NON_COMPLIANT, overdueCompliance.getStatus());
        assertEquals(true, application.isFlagged());
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
        verify(reminderRepository, times(1)).save(any(ComplianceReminder.class));
    }

    @Test
    public void testRunAutoVerification_EscalatesSeverelyOverdueCases() {
        // Mock findAll to return the non-compliant compliance in list
        when(complianceRepository.findAll()).thenReturn(Collections.singletonList(nonCompliantCompliance));
        when(reminderRepository.existsByComplianceIdAndReminderType(102L, ComplianceReminderType.ESCALATED)).thenReturn(false);

        int count = reminderService.runAutoVerificationAndReminders();

        assertEquals(1, count);
        verify(notificationService, times(1)).notifyAdmin(eq(application), eq(WorkflowEvent.ESCALATION_TRIGGERED), anyString());
        verify(emailService, times(1)).sendEmail(eq("citizen@example.com"), contains("ESCALATED"), anyString());
        verify(reminderRepository, times(1)).save(any(ComplianceReminder.class));
    }
}
