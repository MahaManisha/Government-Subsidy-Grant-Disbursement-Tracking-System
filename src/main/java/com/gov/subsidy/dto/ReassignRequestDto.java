package com.gov.subsidy.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request body for reassigning an application to a different officer at the same level.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request body for reassigning an application to a different officer")
public class ReassignRequestDto {

    @NotNull(message = "Actioning officer ID is required")
    @Schema(description = "ID of the officer or admin initiating the reassignment", example = "10",
            requiredMode = Schema.RequiredMode.REQUIRED)
    private Long actionedByOfficerId;

    @NotNull(message = "Target officer ID is required")
    @Schema(description = "ID of the officer to reassign the application to", example = "15",
            requiredMode = Schema.RequiredMode.REQUIRED)
    private Long newOfficerId;

    @Schema(description = "Reason for the reassignment",
            example = "Officer on leave. Reassigning to available team member.")
    private String remarks;
}
