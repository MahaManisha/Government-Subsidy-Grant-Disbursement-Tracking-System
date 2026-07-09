package com.gov.subsidy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Response DTO for a single WorkflowAuditLog entry. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowAuditLogDto {

    private Long   id;
    private Long   applicationId;
    private String applicationNumber;
    private String event;
    private String fromStatus;
    private String toStatus;
    private String fromStage;
    private String toStage;
    private String actor;
    private String description;
    private Long   slaBreachHours;
    private boolean automated;
    private LocalDateTime occurredAt;
}
