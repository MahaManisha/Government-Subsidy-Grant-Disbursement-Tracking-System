package com.gov.subsidy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SchemeDto {

    private Long id;
    private String name;
    private String code;
    private String description;
    private BigDecimal budgetAllocation;
    private BigDecimal remainingBudget;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean active;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}
