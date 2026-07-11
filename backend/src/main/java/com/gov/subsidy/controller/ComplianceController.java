package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.BaseResponse;
import com.gov.subsidy.dto.ComplianceDto;
import com.gov.subsidy.dto.ComplianceRequestDto;
import com.gov.subsidy.dto.ComplianceUpdateDto;
import com.gov.subsidy.service.ComplianceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/compliances")
@Tag(
        name = "Compliance Tracking",
        description = "API endpoints to manage compliance verification records, uploaded proofs, and approvals for subsidy disbursement milestones."
)
public class ComplianceController {

    private final ComplianceService complianceService;

    public ComplianceController(ComplianceService complianceService) {
        this.complianceService = complianceService;
    }

    @PostMapping
    @Operation(summary = "Create a Compliance Record", description = "Submits proof and schedules an inspection for a milestone payment.")
    public ResponseEntity<BaseResponse<ComplianceDto>> createComplianceRecord(@Valid @RequestBody ComplianceRequestDto request) {
        ComplianceDto dto = complianceService.createComplianceRecord(request);
        return new ResponseEntity<>(BaseResponse.success(dto, "Compliance record created successfully"), HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get Compliance Details", description = "Retrieves compliance record details by ID.")
    public ResponseEntity<BaseResponse<ComplianceDto>> getComplianceDetails(@PathVariable Long id) {
        ComplianceDto dto = complianceService.getComplianceDetails(id);
        return ResponseEntity.ok(BaseResponse.success(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update Compliance Record", description = "Updates details, remarks, inspection dates, or metadata of an active compliance record.")
    public ResponseEntity<BaseResponse<ComplianceDto>> updateCompliance(
            @PathVariable Long id,
            @Valid @RequestBody ComplianceUpdateDto request) {
        ComplianceDto dto = complianceService.updateCompliance(id, request);
        return ResponseEntity.ok(BaseResponse.success(dto, "Compliance record updated successfully"));
    }

    @PostMapping("/{id}/approve")
    @Operation(summary = "Approve Compliance", description = "Approves the compliance checks, releasing blocks on the next milestone release.")
    public ResponseEntity<BaseResponse<ComplianceDto>> approveCompliance(@PathVariable Long id) {
        ComplianceDto dto = complianceService.approveCompliance(id);
        return ResponseEntity.ok(BaseResponse.success(dto, "Compliance approved successfully"));
    }

    @PostMapping("/{id}/reject")
    @Operation(summary = "Reject Compliance", description = "Rejects compliance checks and records officer reasons.")
    public ResponseEntity<BaseResponse<ComplianceDto>> rejectCompliance(
            @PathVariable Long id,
            @RequestParam(required = false) String reason) {
        ComplianceDto dto = complianceService.rejectCompliance(id, reason);
        return ResponseEntity.ok(BaseResponse.success(dto, "Compliance rejected successfully"));
    }

    @GetMapping("/application/{applicationId}")
    @Operation(summary = "Get Compliances by Application ID", description = "Retrieves all compliance checks submitted for a specific application ID.")
    public ResponseEntity<BaseResponse<List<ComplianceDto>>> getCompliancesByApplication(@PathVariable Long applicationId) {
        List<ComplianceDto> compliances = complianceService.getCompliancesByApplication(applicationId);
        return ResponseEntity.ok(BaseResponse.success(compliances));
    }
}
