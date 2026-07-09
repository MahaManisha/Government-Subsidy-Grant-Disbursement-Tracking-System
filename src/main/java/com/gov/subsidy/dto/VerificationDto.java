package com.gov.subsidy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO representing the full state of a Verification record,
 * including the linked application summary, field officer, and audit history.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VerificationDto {

    private Long id;

    // ── Application summary ──────────────────────────────────────────────────
    private Long applicationId;
    private String applicationNumber;
    private String workflowStatus;
    private String currentStage;

    // ── Field Officer ────────────────────────────────────────────────────────
    private UserDto fieldOfficer;

    // ── Verification details ─────────────────────────────────────────────────
    private String status;
    private LocalDateTime verifiedDate;
    private String remarks;
    private BigDecimal geotagLatitude;
    private BigDecimal geotagLongitude;
    private String documentProofUrl;

    // ── Audit trail ──────────────────────────────────────────────────────────
    private List<VerificationHistoryDto> history;

    // ── Audit metadata ───────────────────────────────────────────────────────
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}
