package com.gov.subsidy.dto;

import jakarta.validation.constraints.DecimalMin;
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
public class DisbursementMilestoneRequestDto {

    @NotNull(message = "Milestone percentage is required")
    @DecimalMin(value = "0.01", message = "Percentage must be greater than zero")
    private BigDecimal percentage;
}
