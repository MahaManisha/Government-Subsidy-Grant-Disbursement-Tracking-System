package com.gov.subsidy.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BeneficiaryCreateDto {

    private Long userId;

    @NotBlank(message = "Unique Identification Number is required")
    @Size(max = 20, message = "Unique Identification Number must not exceed 20 characters")
    private String uniqueIdNumber;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Phone number must be valid (10 to 15 digits)")
    private String phoneNumber;

    @NotBlank(message = "Address is required")
    @Size(max = 500, message = "Address must not exceed 500 characters")
    private String address;

    @NotBlank(message = "Bank account number is required")
    @Size(min = 9, max = 20, message = "Bank account number must be between 9 and 20 digits")
    private String bankAccountNumber;

    @NotBlank(message = "Bank IFSC code is required")
    @Pattern(regexp = "^[A-Z]{4}0[A-Z0-9]{6}$", message = "IFSC code must be valid (e.g. SBIN0001234)")
    private String bankIfscCode;

    @NotNull(message = "Annual income is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Annual income must be a positive value")
    private BigDecimal annualIncome;

    @NotBlank(message = "Eligibility status is required")
    private String eligibilityStatus;

    @NotBlank(message = "Gender is required")
    private String gender;

    @NotBlank(message = "Beneficiary category is required")
    private String category;
}
