package com.gov.subsidy.service;

import com.gov.subsidy.dto.ComplianceReminderDto;

import java.util.List;

public interface ComplianceReminderService {
    int runAutoVerificationAndReminders();
    List<ComplianceReminderDto> getReminderHistory(Long complianceId);
}
