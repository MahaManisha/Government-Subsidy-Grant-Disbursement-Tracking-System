package com.gov.subsidy.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO used for creating a new government scheme.
 *
 * <p>The {@code remainingBudget} is automatically set to {@code budgetAllocation}
 * at creation time by the service layer and is therefore excluded from this DTO.</p>
 *
 * <p>The {@code active} flag is also auto-set to {@code true} on creation.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request payload for creating a new government scheme")
public class SchemeCreateDto {

    @NotBlank(message = "Scheme name is required")
    @Size(max = 150, message = "Scheme name must not exceed 150 characters")
    @Schema(
            description = "Full display name of the government scheme. Must be unique.",
            example = "Pradhan Mantri Fasal Bima Yojana"
    )
    private String name;

    @NotBlank(message = "Scheme code is required")
    @Size(max = 30, message = "Scheme code must not exceed 30 characters")
    @Pattern(regexp = "^[A-Z0-9_-]{2,30}$",
            message = "Scheme code must be 2-30 characters and may only contain uppercase letters, digits, hyphens, and underscores")
    @Schema(
            description = "Short, unique alphanumeric code identifying the scheme (uppercase letters, digits, hyphens, underscores). " +
                    "Used as a business key. Must be unique.",
            example = "PMFBY-2026"
    )
    private String code;

    @NotBlank(message = "Scheme description is required")
    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    @Schema(
            description = "Detailed description of the scheme's objectives, target beneficiaries, and coverage.",
            example = "Crop insurance scheme for farmers to provide financial support in case of crop failures."
    )
    private String description;

    @NotNull(message = "Budget allocation is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Budget allocation must be greater than zero")
    @Digits(integer = 15, fraction = 2, message = "Budget allocation must not exceed 15 integer digits and 2 decimal places")
    @Schema(
            description = "Total budget allocated to the scheme in Indian Rupees. Must be strictly greater than zero.",
            example = "50000000.00"
    )
    private BigDecimal budgetAllocation;

    @NotNull(message = "Start date is required")
    @Schema(
            description = "Date from which the scheme becomes operational (ISO-8601 format: YYYY-MM-DD).",
            example = "2026-06-01",
            type = "string",
            format = "date"
    )
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    @Future(message = "End date must be a future date")
    @Schema(
            description = "Date on which the scheme closes (ISO-8601 format: YYYY-MM-DD). " +
                    "Must be strictly after the start date and must be a future date.",
            example = "2027-06-01",
            type = "string",
            format = "date"
    )
    private LocalDate endDate;

    @NotBlank(message = "Scheme status is required")
    @Schema(
            description = "Initial operational status of the scheme.",
            example = "ACTIVE",
            allowableValues = {"ACTIVE", "INACTIVE", "DRAFT", "ARCHIVED"}
    )
    private String status;
}
