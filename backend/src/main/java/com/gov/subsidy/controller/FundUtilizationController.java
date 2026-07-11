package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.BaseResponse;
import com.gov.subsidy.dto.FundUtilizationDto;
import com.gov.subsidy.dto.FundUtilizationRequestDto;
import com.gov.subsidy.dto.FundUtilizationSummaryDto;
import com.gov.subsidy.dto.FundUtilizationVerificationDto;
import com.gov.subsidy.enums.VerificationStatus;
import com.gov.subsidy.service.FundUtilizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/fund-utilizations")
@Tag(
        name = "Fund Utilization Tracking",
        description = "API endpoints for beneficiaries to report how grant funds are spent, and for officers to review and verify expenditure proofs."
)
public class FundUtilizationController {

    private final FundUtilizationService utilizationService;

    public FundUtilizationController(FundUtilizationService utilizationService) {
        this.utilizationService = utilizationService;
    }

    @PostMapping
    @Operation(summary = "Submit Fund Utilization", description = "Beneficiary submits utilization amount, purpose, and supporting documents proof.")
    public ResponseEntity<BaseResponse<FundUtilizationDto>> submitUtilization(@Valid @RequestBody FundUtilizationRequestDto request) {
        FundUtilizationDto dto = utilizationService.submitUtilization(request);
        return new ResponseEntity<>(BaseResponse.success(dto, "Utilization details submitted successfully"), HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get Utilization Details", description = "Retrieves utilization detail record by ID.")
    public ResponseEntity<BaseResponse<FundUtilizationDto>> getUtilizationDetails(@PathVariable Long id) {
        FundUtilizationDto dto = utilizationService.getUtilizationDetails(id);
        return ResponseEntity.ok(BaseResponse.success(dto));
    }

    @PostMapping("/{id}/verify")
    @Operation(summary = "Verify Utilization Record", description = "Officer approves (VERIFIED) or rejects (REJECTED) a utilization submission with verification comments.")
    public ResponseEntity<BaseResponse<FundUtilizationDto>> verifyUtilization(
            @PathVariable Long id,
            @RequestParam VerificationStatus status,
            @RequestBody(required = false) FundUtilizationVerificationDto request) {
        FundUtilizationVerificationDto verificationRequest = request != null ? request : new FundUtilizationVerificationDto();
        FundUtilizationDto dto = utilizationService.verifyUtilization(id, status, verificationRequest);
        return ResponseEntity.ok(BaseResponse.success(dto, "Utilization record verified successfully"));
    }

    @GetMapping("/application/{applicationId}/summary")
    @Operation(summary = "Get Application Utilization Summary", description = "Calculates total released amount, total verified utilized amount, remaining balance, and utilization percentage split.")
    public ResponseEntity<BaseResponse<FundUtilizationSummaryDto>> getUtilizationSummary(@PathVariable Long applicationId) {
        FundUtilizationSummaryDto summary = utilizationService.getUtilizationSummary(applicationId);
        return ResponseEntity.ok(BaseResponse.success(summary));
    }
}
