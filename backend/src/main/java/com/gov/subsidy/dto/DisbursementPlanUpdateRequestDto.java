package com.gov.subsidy.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisbursementPlanUpdateRequestDto {

    private String remarks;

    @NotEmpty(message = "Milestones list cannot be empty")
    private List<DisbursementMilestoneRequestDto> milestones;
}
