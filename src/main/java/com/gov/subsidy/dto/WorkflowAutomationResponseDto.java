package com.gov.subsidy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Full automation response — the new application state plus the complete audit trail. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowAutomationResponseDto {

    /** The event that was just triggered. */
    private String event;

    /** Human-readable summary of what the engine did. */
    private String summary;

    /** Updated application state after the automation step. */
    private ApplicationDto application;

    /** Full workflow audit trail for this application (oldest first). */
    private List<WorkflowAuditLogDto> auditTrail;
}
