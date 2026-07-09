package com.gov.subsidy.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request body for manually flagging an application as suspicious.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request body for manually flagging an application as suspicious")
public class FlagRequestDto {

    @NotNull(message = "Actioning officer ID is required")
    @Schema(description = "ID of the officer raising the flag", example = "10",
            requiredMode = Schema.RequiredMode.REQUIRED)
    private Long actionedByOfficerId;

    @NotBlank(message = "Reason for flagging is required")
    @Schema(description = "Reason for marking the application as suspicious",
            example = "Duplicate Aadhaar detected across multiple applications.",
            requiredMode = Schema.RequiredMode.REQUIRED)
    private String reason;
}
