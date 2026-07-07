package com.gov.subsidy.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationCreateDto {

    @NotNull(message = "Beneficiary ID is required")
    private Long beneficiaryId;

    @NotNull(message = "Scheme ID is required")
    private Long schemeId;

    @NotNull(message = "Requested amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Requested amount must be greater than zero")
    private BigDecimal requestedAmount;

    @NotBlank(message = "Priority level is required")
    private String priority;
}
