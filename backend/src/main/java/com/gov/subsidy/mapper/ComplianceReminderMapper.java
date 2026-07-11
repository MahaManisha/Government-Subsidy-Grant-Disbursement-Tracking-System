package com.gov.subsidy.mapper;

import com.gov.subsidy.dto.ComplianceReminderDto;
import com.gov.subsidy.entity.ComplianceReminder;
import org.springframework.stereotype.Component;

@Component
public class ComplianceReminderMapper {
    public ComplianceReminderDto toDto(ComplianceReminder entity) {
        if (entity == null) {
            return null;
        }
        return ComplianceReminderDto.builder()
                .id(entity.getId())
                .complianceId(entity.getCompliance().getId())
                .recipientId(entity.getRecipient().getId())
                .recipientUsername(entity.getRecipient().getUsername())
                .reminderType(entity.getReminderType().name())
                .sentVia(entity.getSentVia())
                .sentAt(entity.getSentAt())
                .message(entity.getMessage())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
