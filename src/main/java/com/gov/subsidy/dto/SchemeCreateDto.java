package com.gov.subsidy.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SchemeCreateDto {

    @NotBlank(message = "Scheme name is required")
    @Size(max = 150, message = "Scheme name must not exceed 150 characters")
    private String name;

    @NotBlank(message = "Scheme code is required")
    @Size(max = 30, message = "Scheme code must not exceed 30 characters")
    private String code;

    @NotBlank(message = "Scheme description is required")
    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    @NotNull(message = "Budget allocation is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Budget allocation must be greater than zero")
    private BigDecimal budgetAllocation;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @NotBlank(message = "Scheme status is required")
    private String status;
}
