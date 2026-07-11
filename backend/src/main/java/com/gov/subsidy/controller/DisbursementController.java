package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.BaseResponse;
import com.gov.subsidy.dto.DisbursementPlanDto;
import com.gov.subsidy.dto.DisbursementPlanRequestDto;
import com.gov.subsidy.dto.DisbursementPlanUpdateRequestDto;
import com.gov.subsidy.service.DisbursementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/disbursement-plans")
@Tag(
        name = "Disbursement Planning & Scheduling",
        description = "API endpoints to plan and schedule multiple disbursement milestones for approved subsidy applications."
)
public class DisbursementController {

    private final DisbursementService disbursementService;

    public DisbursementController(DisbursementService disbursementService) {
        this.disbursementService = disbursementService;
    }

    @PostMapping
    @Operation(summary = "Create a new Disbursement Plan", description = "Creates a disbursement plan with automated milestone generation and validation.")
    public ResponseEntity<BaseResponse<DisbursementPlanDto>> createPlan(@Valid @RequestBody DisbursementPlanRequestDto request) {
        DisbursementPlanDto created = disbursementService.createPlan(request);
        return new ResponseEntity<>(BaseResponse.success(created, "Disbursement plan created successfully"), HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get Disbursement Plan by ID", description = "Retrieves a specific disbursement plan and its scheduled milestones.")
    public ResponseEntity<BaseResponse<DisbursementPlanDto>> getPlan(@PathVariable Long id) {
        DisbursementPlanDto plan = disbursementService.getPlan(id);
        return ResponseEntity.ok(BaseResponse.success(plan));
    }

    @GetMapping("/application/{applicationId}")
    @Operation(summary = "Get Disbursement Plan by Application ID", description = "Retrieves the disbursement plan associated with a given application ID.")
    public ResponseEntity<BaseResponse<DisbursementPlanDto>> getPlanByApplicationId(@PathVariable Long applicationId) {
        DisbursementPlanDto plan = disbursementService.getPlanByApplicationId(applicationId);
        return ResponseEntity.ok(BaseResponse.success(plan));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update Disbursement Plan", description = "Updates comments or regenerates milestones for an active disbursement plan.")
    public ResponseEntity<BaseResponse<DisbursementPlanDto>> updatePlan(
            @PathVariable Long id,
            @Valid @RequestBody DisbursementPlanUpdateRequestDto request) {
        DisbursementPlanDto updated = disbursementService.updatePlan(id, request);
        return ResponseEntity.ok(BaseResponse.success(updated, "Disbursement plan updated successfully"));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel Disbursement Plan", description = "Cancels an active disbursement plan and marks pending milestones as FAILED.")
    public ResponseEntity<BaseResponse<DisbursementPlanDto>> cancelPlan(@PathVariable Long id) {
        DisbursementPlanDto cancelled = disbursementService.cancelPlan(id);
        return ResponseEntity.ok(BaseResponse.success(cancelled, "Disbursement plan cancelled successfully"));
    }

    @PostMapping("/{id}/milestones/{milestoneNumber}/release")
    @Operation(summary = "Release Disbursement Milestone", description = "Releases a disbursement milestone payment if it is the first milestone or the previous milestone is COMPLIANT.")
    public ResponseEntity<BaseResponse<DisbursementPlanDto>> releaseMilestone(
            @PathVariable Long id,
            @PathVariable Integer milestoneNumber,
            @RequestParam Long financeOfficerId) {
        DisbursementPlanDto released = disbursementService.releaseMilestone(id, milestoneNumber, financeOfficerId);
        return ResponseEntity.ok(BaseResponse.success(released, "Milestone released successfully"));
    }

    @GetMapping
    @Operation(summary = "Get All Disbursement Plans", description = "Retrieves all disbursement plans currently registered in the system.")
    public ResponseEntity<BaseResponse<List<DisbursementPlanDto>>> getAllPlans() {
        List<DisbursementPlanDto> plans = disbursementService.getAllPlans();
        return ResponseEntity.ok(BaseResponse.success(plans));
    }
}
