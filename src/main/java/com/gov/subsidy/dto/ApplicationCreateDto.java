package com.gov.subsidy.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request payload for submitting a new subsidy application.
 *
 * <p>The controller validates all fields via Bean Validation before the request
 * reaches the service layer.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request body for submitting a new subsidy application")
public class ApplicationCreateDto {

    @NotNull(message = "Beneficiary ID is required")
    @Schema(
            description = "Primary key of the beneficiary submitting the application",
            example = "5",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private Long beneficiaryId;

    @NotNull(message = "Scheme ID is required")
    @Schema(
            description = "Primary key of the target scheme (must be ACTIVE)",
            example = "2",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private Long schemeId;

    @NotNull(message = "Requested amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Requested amount must be greater than zero")
    @Digits(integer = 15, fraction = 2, message = "Requested amount must not exceed 15 integer digits and 2 decimal places")
    @Schema(
            description = "Amount of subsidy/grant requested by the beneficiary (must be > 0)",
            example = "25000.00",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private BigDecimal requestedAmount;

    @NotBlank(message = "Priority level is required")
    @Schema(
            description = "Application priority level. Allowed values: LOW, MEDIUM, HIGH, CRITICAL",
            example = "MEDIUM",
            allowableValues = {"LOW", "MEDIUM", "HIGH", "CRITICAL"},
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private String priority;
}
