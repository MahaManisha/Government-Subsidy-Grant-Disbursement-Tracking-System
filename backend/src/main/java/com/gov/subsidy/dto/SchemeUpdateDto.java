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
 * DTO used for updating an existing government scheme.
 *
 * <p>The scheme {@code code} is intentionally excluded from updates because it
 * is used as the business key in external references (applications, reports).
 * Changing it would break existing references.</p>
 *
 * <p>The {@code remainingBudget} is a derived/operational field managed internally
 * by the disbursement workflow and is therefore not updatable through this DTO.
 * Only the total {@code budgetAllocation} may be adjusted here.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request payload for updating an existing government scheme")
public class SchemeUpdateDto {

    @NotBlank(message = "Scheme name is required")
    @Size(max = 150, message = "Scheme name must not exceed 150 characters")
    @Schema(
            description = "Updated display name of the scheme. Must remain unique across all schemes.",
            example = "Pradhan Mantri Fasal Bima Yojana (Revised)"
    )
    private String name;

    @NotBlank(message = "Scheme description is required")
    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    @Schema(
            description = "Updated description of the scheme's objectives, target beneficiaries, and coverage.",
            example = "Revised crop insurance scheme with enhanced coverage for small and marginal farmers."
    )
    private String description;

    @NotNull(message = "Budget allocation is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Budget allocation must be greater than zero")
    @Digits(integer = 15, fraction = 2, message = "Budget allocation must not exceed 15 integer digits and 2 decimal places")
    @Schema(
            description = "Revised total budget allocated to the scheme in Indian Rupees. Must be strictly greater than zero.",
            example = "75000000.00"
    )
    private BigDecimal budgetAllocation;

    @NotNull(message = "Start date is required")
    @Schema(
            description = "Revised start date of the scheme (ISO-8601 format: YYYY-MM-DD).",
            example = "2026-06-01",
            type = "string",
            format = "date"
    )
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    @Schema(
            description = "Revised end date of the scheme (ISO-8601 format: YYYY-MM-DD). " +
                    "Must be strictly after the start date.",
            example = "2027-12-31",
            type = "string",
            format = "date"
    )
    private LocalDate endDate;

    @NotNull(message = "Active flag is required")
    @Schema(
            description = "Whether the scheme is currently active. Set to false to deactivate without archiving.",
            example = "true"
    )
    private Boolean active;

    @NotBlank(message = "Scheme status is required")
    @Schema(
            description = "Updated operational status of the scheme.",
            example = "ACTIVE",
            allowableValues = {"ACTIVE", "INACTIVE", "DRAFT", "ARCHIVED"}
    )
    private String status;

    private Integer minAge;
    private Integer maxAge;
    private BigDecimal maxAnnualIncome;
    private String gender;
    private String category;
    private String occupation;
    private String state;
    private String district;
    private String requiredDocuments;
    private BigDecimal maxGrantAmount;
}
