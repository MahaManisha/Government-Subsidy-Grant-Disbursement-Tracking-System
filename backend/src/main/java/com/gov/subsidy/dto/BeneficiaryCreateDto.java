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
 * DTO used for creating a new beneficiary profile.
 *
 * <p>The {@code uniqueIdNumber} field represents the beneficiary's government-issued
 * Aadhaar number (12 digits). Once created, this value is immutable and cannot be
 * changed through the update API.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request payload for creating a new beneficiary profile")
public class BeneficiaryCreateDto {

    @Schema(
            description = "ID of an existing User account to link this beneficiary profile to. " +
                    "Each user account can be linked to at most one beneficiary profile.",
            example = "101"
    )
    private Long userId;

    @NotBlank(message = "Aadhaar number (Unique Identification Number) is required")
    @Pattern(regexp = "^[0-9]{12}$", message = "Aadhaar number must be exactly 12 digits")
    @Schema(
            description = "12-digit Aadhaar number of the beneficiary. Must be unique across all beneficiaries. " +
                    "This field is immutable once the profile is created.",
            example = "123456789012"
    )
    private String uniqueIdNumber;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Phone number must be valid (10 to 15 digits)")
    @Schema(
            description = "Registered mobile number of the beneficiary. Must be unique across all beneficiaries.",
            example = "9876543210"
    )
    private String phoneNumber;

    @NotBlank(message = "Address is required")
    @Size(max = 500, message = "Address must not exceed 500 characters")
    @Schema(
            description = "Current residential or correspondence address of the beneficiary.",
            example = "123, Green Valley, New Delhi, 110001"
    )
    private String address;

    @NotBlank(message = "Bank account number is required")
    @Size(min = 9, max = 20, message = "Bank account number must be between 9 and 20 digits")
    @Schema(
            description = "Beneficiary's bank account number linked for subsidy disbursements. Must be unique.",
            example = "918273645281"
    )
    private String bankAccountNumber;

    @NotBlank(message = "Bank IFSC code is required")
    @Pattern(regexp = "^[A-Z]{4}0[A-Z0-9]{6}$", message = "IFSC code must be valid (e.g. SBIN0001234)")
    @Schema(
            description = "IFSC code of the beneficiary's bank branch. Must follow the standard 11-character format " +
                    "(4 letters, 0, then 6 alphanumeric characters).",
            example = "SBIN0001234"
    )
    private String bankIfscCode;

    @Past(message = "Date of birth must be in the past")
    @Schema(
            description = "Date of birth of the beneficiary (ISO-8601 format: YYYY-MM-DD). " +
                    "Used to determine Senior Citizen eligibility (age >= 60 earns bonus points). Optional.",
            example = "1975-03-15"
    )
    private LocalDate dateOfBirth;

    @NotNull(message = "Annual income is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Annual income must be a positive value")
    @Digits(integer = 12, fraction = 2, message = "Income format must match up to 12 digits and 2 decimals")
    @Schema(
            description = "Annual income of the beneficiary in Indian Rupees. Must be zero or a positive value.",
            example = "150000.00"
    )
    private BigDecimal annualIncome;

    @NotBlank(message = "Eligibility status is required")
    @Schema(
            description = "Initial eligibility/verification status of the beneficiary.",
            example = "PENDING",
            allowableValues = {"PENDING", "VERIFIED", "REJECTED", "RE_VERIFICATION_REQUESTED"}
    )
    private String eligibilityStatus;

    @NotBlank(message = "Gender is required")
    @Schema(
            description = "Gender of the beneficiary.",
            example = "MALE",
            allowableValues = {"MALE", "FEMALE", "OTHER"}
    )
    private String gender;

    @NotBlank(message = "Beneficiary category is required")
    @Schema(
            description = "Social category of the beneficiary as per government classification.",
            example = "OBC",
            allowableValues = {"GENERAL", "OBC", "SC", "ST", "BPL"}
    )
    private String category;
}
