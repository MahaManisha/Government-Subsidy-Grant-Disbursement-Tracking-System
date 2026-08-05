package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.ApplicationCreateDto;
import com.gov.subsidy.dto.ApplicationDto;
import com.gov.subsidy.dto.BaseResponse;
import com.gov.subsidy.service.ApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * REST controller exposing the Application Submission endpoint.
 *
 * <p>Base URL: {@code /v1/applications}</p>
 *
 * <p>All responses are wrapped in a {@link BaseResponse} envelope:
 * <ul>
 *   <li>{@code success}   — boolean outcome flag</li>
 *   <li>{@code message}   — human-readable result summary</li>
 *   <li>{@code data}      — the response payload ({@code null} on error)</li>
 *   <li>{@code timestamp} — response generation timestamp (ISO-8601)</li>
 * </ul>
 * </p>
 */
@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/applications")
@Tag(
        name = "Application Submission",
        description = "Endpoint for beneficiaries to submit subsidy/grant applications. " +
                "Validates beneficiary existence, scheme existence, scheme active status, " +
                "and prevents duplicate submissions. Auto-generates a unique application " +
                "number in the format APP-YYYY-NNNNNN."
)
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    // =========================================================================
    // POST /v1/applications — Submit Application
    // =========================================================================

    @PostMapping
    @Operation(
            summary = "Submit a new subsidy application",
            description = """
                    Submits a new subsidy application on behalf of a registered beneficiary.

                    **Validations performed (in order):**
                    1. Beneficiary with the given `beneficiaryId` must exist in the system.
                    2. Scheme with the given `schemeId` must exist in the system.
                    3. Scheme must have `status = ACTIVE` and `active = true`.
                    4. The same beneficiary must not have already applied for the same scheme (no duplicates).

                    **Auto-generated fields:**
                    - `applicationNumber` — format: `APP-YYYY-NNNNNN` (e.g. `APP-2026-000001`)
                    - `workflowStatus`    — always initialised to `SUBMITTED`
                    - `currentStage`      — always initialised to `INITIATION`
                    - `submittedDate`     — set to the current server timestamp

                    **Eligibility scoring is NOT performed at submission time.**
                    """
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "201",
                    description = "Application submitted successfully",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class),
                            examples = @ExampleObject(
                                    name = "Success – 201 Created",
                                    summary = "Application submitted and persisted",
                                    value = """
                                            {
                                              "success": true,
                                              "message": "Subsidy application submitted successfully",
                                              "data": {
                                                "id": 1,
                                                "beneficiary": {
                                                  "id": 5,
                                                  "uniqueIdNumber": "123456789012",
                                                  "phoneNumber": "9876543210",
                                                  "address": "12, Green Park, New Delhi",
                                                  "bankAccountNumber": "918273645281",
                                                  "bankIfscCode": "SBIN0001234",
                                                  "annualIncome": 150000.00,
                                                  "eligibilityStatus": "VERIFIED",
                                                  "gender": "MALE",
                                                  "category": "OBC"
                                                },
                                                "scheme": {
                                                  "id": 2,
                                                  "name": "Pradhan Mantri Fasal Bima Yojana",
                                                  "code": "PMFBY-2026",
                                                  "description": "Crop insurance scheme for farmers.",
                                                  "budgetAllocation": 50000000.00,
                                                  "remainingBudget": 42000000.00,
                                                  "startDate": "2026-06-01",
                                                  "endDate": "2027-06-01",
                                                  "active": true,
                                                  "status": "ACTIVE"
                                                },
                                                "applicationNumber": "APP-2026-000001",
                                                "requestedAmount": 25000.00,
                                                "approvedAmount": null,
                                                "workflowStatus": "SUBMITTED",
                                                "currentStage": "INITIATION",
                                                "eligibilityScore": null,
                                                "assignedOfficer": null,
                                                "submittedDate": "2026-07-09T18:41:52",
                                                "verifiedDate": null,
                                                "approvedDate": null,
                                                "lastModifiedDate": "2026-07-09T18:41:52",
                                                "remarks": null,
                                                "priority": "MEDIUM",
                                                "isFlagged": false,
                                                "reVerificationRequested": false,
                                                "rejectionReason": null,
                                                "createdAt": "2026-07-09T18:41:52",
                                                "updatedAt": "2026-07-09T18:41:52",
                                                "createdBy": null,
                                                "updatedBy": null
                                              },
                                              "timestamp": "2026-07-09T18:41:52"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Validation failed – missing or invalid request fields",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    name = "Validation Error – 400",
                                    summary = "Required field missing",
                                    value = """
                                            {
                                              "success": false,
                                              "message": "Input validation failed",
                                              "data": {
                                                "timestamp": "2026-07-09T18:41:52",
                                                "message": "Validation failed",
                                                "details": "uri=/v1/applications",
                                                "validationErrors": [
                                                  "Beneficiary ID is required",
                                                  "Requested amount must be greater than zero"
                                                ]
                                              },
                                              "timestamp": "2026-07-09T18:41:52"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Beneficiary or Scheme not found",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    name = "Not Found – 404",
                                    summary = "Beneficiary does not exist",
                                    value = """
                                            {
                                              "success": false,
                                              "message": "Resource not found",
                                              "data": {
                                                "timestamp": "2026-07-09T18:41:52",
                                                "message": "Beneficiary not found with ID: 999",
                                                "details": "uri=/v1/applications"
                                              },
                                              "timestamp": "2026-07-09T18:41:52"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "Duplicate application – beneficiary already applied for this scheme",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    name = "Conflict – 409",
                                    summary = "Duplicate application detected",
                                    value = """
                                            {
                                              "success": false,
                                              "message": "Duplicate resource conflict",
                                              "data": {
                                                "timestamp": "2026-07-09T18:41:52",
                                                "message": "Beneficiary with ID 5 has already submitted an application for scheme 'Pradhan Mantri Fasal Bima Yojana'.",
                                                "details": "uri=/v1/applications"
                                              },
                                              "timestamp": "2026-07-09T18:41:52"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "422",
                    description = "Scheme is not active – applications cannot be submitted",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    name = "Unprocessable Entity – 422",
                                    summary = "Scheme status is INACTIVE",
                                    value = """
                                            {
                                              "success": false,
                                              "message": "Scheme is not active",
                                              "data": {
                                                "timestamp": "2026-07-09T18:41:52",
                                                "message": "Scheme 'Old Farm Aid Programme' (ID: 3) is not currently active. Applications can only be submitted for schemes with status ACTIVE.",
                                                "details": "uri=/v1/applications"
                                              },
                                              "timestamp": "2026-07-09T18:41:52"
                                            }
                                            """
                            )
                    )
            )
    })
    @PreAuthorize("hasRole('ADMIN') or (hasRole('BENEFICIARY') and principal != null && @beneficiaryServiceImpl.getBeneficiaryById(#createDto.beneficiaryId).user != null && @beneficiaryServiceImpl.getBeneficiaryById(#createDto.beneficiaryId).user.username == principal.username)")
    public ResponseEntity<BaseResponse<ApplicationDto>> submitApplication(
            @Valid @RequestBody ApplicationCreateDto createDto) {

        ApplicationDto result = applicationService.submitApplication(createDto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(BaseResponse.success(result, "Subsidy application submitted successfully"));
    }

    @GetMapping
    @Operation(summary = "Get all subsidy applications", description = "Retrieves all subsidy application records.")
    @PreAuthorize("hasAnyRole('ADMIN', 'FIELD_OFFICER', 'DISTRICT_OFFICER', 'FINANCE_OFFICER', 'BENEFICIARY')")
    public ResponseEntity<BaseResponse<java.util.List<ApplicationDto>>> getAllApplications() {
        java.util.List<ApplicationDto> result = applicationService.getAllApplications();
        return ResponseEntity.ok(BaseResponse.success(result, "Applications retrieved successfully"));
    }

    @GetMapping("/my")
    @Operation(summary = "Get applications for currently logged-in beneficiary", description = "Retrieves all applications belonging to the authenticated beneficiary.")
    @PreAuthorize("hasAnyRole('BENEFICIARY', 'ADMIN')")
    public ResponseEntity<BaseResponse<java.util.List<ApplicationDto>>> getMyApplications() {
        java.util.List<ApplicationDto> result = applicationService.getMyApplications();
        return ResponseEntity.ok(BaseResponse.success(result, "My applications retrieved successfully"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get application details by ID", description = "Retrieves full details of a specific application.")
    @PreAuthorize("hasAnyRole('ADMIN', 'FIELD_OFFICER', 'DISTRICT_OFFICER', 'FINANCE_OFFICER', 'BENEFICIARY')")
    public ResponseEntity<BaseResponse<ApplicationDto>> getApplicationById(@PathVariable Long id) {
        ApplicationDto result = applicationService.getApplicationById(id);
        return ResponseEntity.ok(BaseResponse.success(result, "Application details retrieved successfully"));
    }
}
