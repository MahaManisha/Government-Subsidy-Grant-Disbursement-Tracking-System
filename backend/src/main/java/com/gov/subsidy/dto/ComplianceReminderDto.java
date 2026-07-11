package com.gov.subsidy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplianceReminderDto {
    private Long id;
    private Long complianceId;
    private Long recipientId;
    private String recipientUsername;
    private String reminderType;
    private String sentVia;
    private LocalDateTime sentAt;
    private String message;
    private LocalDateTime createdAt;
}
