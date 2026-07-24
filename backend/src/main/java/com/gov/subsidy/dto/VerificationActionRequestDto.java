package com.gov.subsidy.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request body for performing a workflow action on an application
 * (Approve, Reject, or Request Re-verification).
 *
 * <p>Used by field officers, district officers, and finance officers to
 * advance or retract the application workflow.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request body for performing a verification workflow action")
public class VerificationActionRequestDto {

    @Schema(
            description = "Primary key of the officer performing the action. " +
                    "Optional if the action is performed by the currently authenticated officer.",
            example = "10"
    )
    private Long officerId;

    @NotBlank(message = "Action is required")
    @Schema(
            description = "The action to perform. Allowed values: APPROVE, REJECT, REQUEST_REVERIFICATION",
            example = "APPROVE",
            allowableValues = {"APPROVE", "REJECT", "REQUEST_REVERIFICATION"},
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private String action;

    @Schema(
            description = "Remarks explaining the action. Required when action is REJECT or REQUEST_REVERIFICATION.",
            example = "All documents verified. Income certificate is authentic."
    )
    private String remarks;

    @Schema(
            description = "Reason for rejection. Required when action is REJECT.",
            example = "Income certificate found to be fraudulent."
    )
    private String rejectionReason;
}
