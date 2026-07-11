package com.gov.subsidy.service;

import com.gov.subsidy.dto.DisbursementPlanDto;
import com.gov.subsidy.dto.DisbursementPlanRequestDto;
import com.gov.subsidy.dto.DisbursementPlanUpdateRequestDto;

import java.util.List;

public interface DisbursementService {
    DisbursementPlanDto createPlan(DisbursementPlanRequestDto request);
    DisbursementPlanDto getPlan(Long id);
    DisbursementPlanDto getPlanByApplicationId(Long applicationId);
    DisbursementPlanDto updatePlan(Long id, DisbursementPlanUpdateRequestDto request);
    DisbursementPlanDto cancelPlan(Long id);
    DisbursementPlanDto releaseMilestone(Long planId, Integer milestoneNumber, Long financeOfficerId);
    List<DisbursementPlanDto> getAllPlans();
}
