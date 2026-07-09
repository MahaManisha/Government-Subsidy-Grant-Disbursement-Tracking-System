package com.gov.subsidy.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request body for assigning a field officer to an application
 * and initiating the verification workflow (SUBMITTED → FIELD_VERIFICATION).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request body for assigning a field officer to an application")
public class AssignOfficerRequestDto {

    @NotNull(message = "Field officer ID is required")
    @Schema(
            description = "Primary key of the User to assign as the field officer. " +
                    "The user must exist in the system.",
            example = "10",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private Long fieldOfficerId;

    @Schema(
            description = "Optional remarks about the assignment decision.",
            example = "Assigned to field officer for district-level verification."
    )
    private String remarks;
}
