package com.gov.subsidy.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO representing a single routing decision record.
 * Returned in the routing response and audit trail.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "A single routing decision made by the Approval Routing Engine")
public class RoutingRecordDto {

    @Schema(description = "Primary key of this routing record", example = "1")
    private Long id;

    @Schema(description = "ID of the application this record belongs to", example = "1")
    private Long applicationId;

    @Schema(description = "Application number", example = "APP-2026-000001")
    private String applicationNumber;

    @Schema(
            description = "The routing decision that was made",
            example = "FAST_TRACK",
            allowableValues = {"FAST_TRACK","STANDARD","DISTRICT_REVIEW","FINANCE_REVIEW",
                               "FLAGGED","ESCALATED","REASSIGNED","REJECTED"}
    )
    private String decision;

    @Schema(description = "Officer/User this application was routed to (null for FLAGGED/REJECTED)")
    private UserDto assignedTo;

    @Schema(description = "Officer who triggered this routing action (null for auto-routing)")
    private UserDto actionedBy;

    @Schema(description = "Eligibility score captured at the moment of routing", example = "90")
    private Integer scoreAtRouting;

    @Schema(description = "Requested amount captured at the moment of routing", example = "450000.00")
    private BigDecimal amountAtRouting;

    @Schema(description = "Machine-generated explanation of why this decision was made",
            example = "Score 92 >= fast-track threshold 90 and amount 25000 < high threshold 500000. Fast-tracked.")
    private String rationale;

    @Schema(description = "Human remarks from the officer performing a manual action")
    private String remarks;

    @Schema(description = "True if this was an automatic system decision, false for manual")
    private boolean autoRouted;

    @Schema(description = "Timestamp when the routing action was performed")
    private LocalDateTime routedAt;

    @Schema(description = "Audit metadata")
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
