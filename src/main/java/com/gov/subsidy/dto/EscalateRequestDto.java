package com.gov.subsidy.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request body for escalating an application to a higher-level officer.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request body for escalating an application to a higher officer level")
public class EscalateRequestDto {

    @NotNull(message = "Actioning officer ID is required")
    @Schema(description = "ID of the officer initiating the escalation", example = "10",
            requiredMode = Schema.RequiredMode.REQUIRED)
    private Long actionedByOfficerId;

    @Schema(description = "Specific officer to escalate to. If omitted, the engine picks the " +
            "least-loaded officer at the next level automatically.", example = "20")
    private Long escalateToOfficerId;

    @Schema(description = "Reason for escalation",
            example = "Application involves a politically sensitive area. Requires district-level review.")
    private String remarks;
}
