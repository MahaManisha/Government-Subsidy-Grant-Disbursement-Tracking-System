package com.gov.subsidy.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisbursementPlanRequestDto {

    @NotNull(message = "Application ID is required")
    private Long applicationId;

    private String remarks;

    @NotEmpty(message = "Milestones list cannot be empty")
    private List<DisbursementMilestoneRequestDto> milestones;
}
