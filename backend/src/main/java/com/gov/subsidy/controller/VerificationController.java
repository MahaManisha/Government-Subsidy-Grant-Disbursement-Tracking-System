package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.*;
import com.gov.subsidy.service.VerificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.access.prepost.PostAuthorize;

import java.util.List;

/**
 * REST controller exposing all Verification Workflow endpoints.
 *
 * <p>Base URL: {@code /api/v1/applications/{applicationId}/verification}</p>
 *
 * <p>Workflow stages:
 * <ol>
 *   <li>POST …/assign-officer     — Assign field officer (SUBMITTED → FIELD_VERIFICATION)</li>
 *   <li>POST …/field-verify       — Field officer acts (→ DISTRICT_REVIEW | REJECTED | RE_VERIFY)</li>
 *   <li>POST …/district-review    — District officer acts (→ FINANCE_REVIEW | REJECTED | RE_VERIFY)</li>
 *   <li>POST …/finance-review     — Finance officer acts (→ APPROVED | REJECTED | RE_VERIFY)</li>
 *   <li>GET  …                    — Retrieve current verification state + history</li>
 *   <li>GET  …/history            — Retrieve full audit trail</li>
 * </ol>
 * </p>
 */
@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/applications/{applicationId}/verification")
@Tag(
        name = "Verification Workflow",
        description = "Manages the 4-stage verification pipeline for a subsidy application. " +
                "Workflow: SUBMITTED → Field Verification → District Review → Finance Review → APPROVED. " +
                "Actions at each stage: APPROVE, REJECT, REQUEST_REVERIFICATION. " +
                "Every transition is appended to a VerificationHistory audit trail."
)
public class VerificationController {

    private final VerificationService verificationService;

    public VerificationController(VerificationService verificationService) {
        this.verificationService = verificationService;
    }

    // =========================================================================
    // POST …/assign-officer — Step 1: Assign Field Officer
    // =========================================================================

    @PostMapping("/assign-officer")
    @Operation(
            summary = "Step 1 — Assign a field officer to begin verification",
            description = """
                    Creates the Verification record and transitions the application from
                    **SUBMITTED** to **UNDER_REVIEW** at the **FIELD_VERIFICATION** stage.

                    **Preconditions:**
                    - Application must exist and be in SUBMITTED status.
                    - No verification record may already exist for this application.
                    - The specified fieldOfficerId must correspond to an existing User.

                    **Side effects:**
                    - Creates a `Verification` entity linked to the application.
                    - Sets `Application.workflowStatus = UNDER_REVIEW`.
                    - Sets `Application.currentStage = FIELD_VERIFICATION`.
                    - Sets `Application.assignedOfficer` to the chosen officer.
                    - Appends first `VerificationHistory` record.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Field officer assigned successfully",
                    content = @Content(mediaType = "application/json",
                            examples = @ExampleObject(name = "Success",
                                    value = """
                                            {
                                              "success": true,
                                              "message": "Field officer assigned. Verification workflow initiated.",
                                              "data": {
                                                "id": 1,
                                                "applicationId": 1,
                                                "applicationNumber": "APP-2026-000001",
                                                "workflowStatus": "UNDER_REVIEW",
                                                "currentStage": "FIELD_VERIFICATION",
                                                "fieldOfficer": { "id": 10, "username": "officer.ramesh", "firstName": "Ramesh", "lastName": "Kumar" },
                                                "status": "PENDING",
                                                "verifiedDate": null,
                                                "remarks": "Assigned to field officer for district-level verification.",
                                                "history": [
                                                  { "id": 1, "officer": { "id": 10 }, "status": "PENDING",
                                                    "remarks": "Field officer assigned.", "actionDate": "2026-07-09T19:05:22" }
                                                ]
                                              },
                                              "timestamp": "2026-07-09T19:05:22"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid workflow transition — application not in SUBMITTED status"),
            @ApiResponse(responseCode = "404", description = "Application or field officer user not found"),
            @ApiResponse(responseCode = "409", description = "Verification record already exists for this application")
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BaseResponse<VerificationDto>> assignFieldOfficer(
            @Parameter(description = "Application primary key", example = "1", required = true)
            @PathVariable Long applicationId,
            @Valid @RequestBody AssignOfficerRequestDto request) {

        VerificationDto result = verificationService.assignFieldOfficer(applicationId, request);
        return ResponseEntity.ok(BaseResponse.success(result,
                "Field officer assigned. Verification workflow initiated."));
    }

    // =========================================================================
    // POST …/field-verify — Step 2: Field Verification
    // =========================================================================

    @PostMapping("/field-verify")
    @Operation(
            summary = "Step 2 — Field officer performs on-site verification",
            description = """
                    Allows the assigned field officer to act on the application at the
                    **FIELD_VERIFICATION** stage.

                    **Preconditions:**
                    - Application must be at FIELD_VERIFICATION stage.
                    - A Verification record must already exist (step 1 completed).

                    **Actions:**
                    | Action                 | Result                                                  |
                    |------------------------|---------------------------------------------------------|
                    | `APPROVE`              | Stage → DISTRICT_REVIEW, Status → UNDER_REVIEW          |
                    | `REJECT`               | Status → REJECTED, application flagged, rejectionReason set |
                    | `REQUEST_REVERIFICATION` | Status → RE_VERIFICATION_REQUESTED, stage stays FIELD_VERIFICATION |

                    **Notes:**
                    - `remarks` is mandatory for REJECT and REQUEST_REVERIFICATION.
                    - `rejectionReason` is mandatory when action is REJECT.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Field verification action applied successfully",
                    content = @Content(mediaType = "application/json",
                            examples = {
                                    @ExampleObject(name = "APPROVE",
                                            value = """
                                                    {
                                                      "success": true,
                                                      "message": "Field verification action applied.",
                                                      "data": {
                                                        "id": 1,
                                                        "applicationId": 1,
                                                        "applicationNumber": "APP-2026-000001",
                                                        "workflowStatus": "UNDER_REVIEW",
                                                        "currentStage": "DISTRICT_REVIEW",
                                                        "status": "VERIFIED",
                                                        "verifiedDate": "2026-07-09T19:05:22",
                                                        "history": [
                                                          { "status": "PENDING",  "actionDate": "2026-07-09T18:00:00" },
                                                          { "status": "VERIFIED", "actionDate": "2026-07-09T19:05:22" }
                                                        ]
                                                      },
                                                      "timestamp": "2026-07-09T19:05:22"
                                                    }
                                                    """
                                    ),
                                    @ExampleObject(name = "REJECT",
                                            value = """
                                                    {
                                                      "success": true,
                                                      "message": "Field verification action applied.",
                                                      "data": {
                                                        "applicationNumber": "APP-2026-000001",
                                                        "workflowStatus": "REJECTED",
                                                        "currentStage": "FIELD_VERIFICATION",
                                                        "status": "REJECTED"
                                                      },
                                                      "timestamp": "2026-07-09T19:05:22"
                                                    }
                                                    """
                                    )
                            }
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid stage or missing required remarks/rejectionReason")
    })
    @PreAuthorize("hasAnyRole('ADMIN', 'FIELD_OFFICER')")
    public ResponseEntity<BaseResponse<VerificationDto>> performFieldVerification(
            @Parameter(description = "Application primary key", example = "1", required = true)
            @PathVariable Long applicationId,
            @Valid @RequestBody VerificationActionRequestDto request) {

        VerificationDto result = verificationService.performFieldVerification(applicationId, request);
        return ResponseEntity.ok(BaseResponse.success(result, "Field verification action applied."));
    }

    // =========================================================================
    // POST …/district-review — Step 3: District Officer Review
    // =========================================================================

    @PostMapping("/district-review")
    @Operation(
            summary = "Step 3 — District officer reviews the field-verified application",
            description = """
                    Allows the district officer to act on the application at the
                    **DISTRICT_REVIEW** stage.

                    **Preconditions:**
                    - Application must be at DISTRICT_REVIEW stage (after field officer approved).

                    **Actions:**
                    | Action                 | Result                                                  |
                    |------------------------|---------------------------------------------------------|
                    | `APPROVE`              | Stage → FINANCE_REVIEW, Status → UNDER_REVIEW           |
                    | `REJECT`               | Status → REJECTED, application flagged                  |
                    | `REQUEST_REVERIFICATION` | Stage → FIELD_VERIFICATION, Status → RE_VERIFICATION_REQUESTED |
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "District review action applied successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid stage or missing required fields")
    })
    @PreAuthorize("hasAnyRole('ADMIN', 'DISTRICT_OFFICER')")
    public ResponseEntity<BaseResponse<VerificationDto>> performDistrictReview(
            @Parameter(description = "Application primary key", example = "1", required = true)
            @PathVariable Long applicationId,
            @Valid @RequestBody VerificationActionRequestDto request) {

        VerificationDto result = verificationService.performDistrictReview(applicationId, request);
        return ResponseEntity.ok(BaseResponse.success(result, "District review action applied."));
    }

    // =========================================================================
    // POST …/finance-review — Step 4: Finance Officer Review
    // =========================================================================

    @PostMapping("/finance-review")
    @Operation(
            summary = "Step 4 — Finance officer performs final approval",
            description = """
                    Allows the finance officer to perform the final review at the **FINANCE_REVIEW** stage.

                    **Preconditions:**
                    - Application must be at FINANCE_REVIEW stage.

                    **Actions:**
                    | Action                 | Result                                                       |
                    |------------------------|--------------------------------------------------------------|
                    | `APPROVE`              | Application fully **APPROVED**, stage → COMPLETED, approvedDate set |
                    | `REJECT`               | Status → REJECTED, application flagged                       |
                    | `REQUEST_REVERIFICATION` | Stage → FIELD_VERIFICATION, Status → RE_VERIFICATION_REQUESTED |

                    **Note:** No disbursement is triggered at this stage. Disbursement is a separate module.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Finance review action applied successfully",
                    content = @Content(mediaType = "application/json",
                            examples = @ExampleObject(name = "APPROVE — Final Approval",
                                    value = """
                                            {
                                              "success": true,
                                              "message": "Finance review action applied.",
                                              "data": {
                                                "applicationId": 1,
                                                "applicationNumber": "APP-2026-000001",
                                                "workflowStatus": "APPROVED",
                                                "currentStage": "COMPLETED",
                                                "status": "VERIFIED",
                                                "verifiedDate": "2026-07-09T19:30:00",
                                                "history": [
                                                  { "status": "PENDING",  "actionDate": "2026-07-09T18:00:00" },
                                                  { "status": "VERIFIED", "actionDate": "2026-07-09T18:30:00", "remarks": "Field approved" },
                                                  { "status": "VERIFIED", "actionDate": "2026-07-09T19:00:00", "remarks": "District approved" },
                                                  { "status": "VERIFIED", "actionDate": "2026-07-09T19:30:00", "remarks": "Finance approved. Application fully approved." }
                                                ]
                                              },
                                              "timestamp": "2026-07-09T19:30:00"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid stage or missing required fields")
    })
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE_OFFICER')")
    public ResponseEntity<BaseResponse<VerificationDto>> performFinanceReview(
            @Parameter(description = "Application primary key", example = "1", required = true)
            @PathVariable Long applicationId,
            @Valid @RequestBody VerificationActionRequestDto request) {

        VerificationDto result = verificationService.performFinanceReview(applicationId, request);
        return ResponseEntity.ok(BaseResponse.success(result, "Finance review action applied."));
    }

    // =========================================================================
    // GET … — Get Current Verification State
    // =========================================================================

    @GetMapping
    @Operation(
            summary = "Get current verification state for an application",
            description = "Returns the full Verification record including the current status, " +
                    "assigned field officer, and the complete VerificationHistory audit trail."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Verification state retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "Application not found or no verification record exists yet")
    })
    @PreAuthorize("hasAnyRole('ADMIN', 'DISTRICT_OFFICER', 'FINANCE_OFFICER') or (hasRole('FIELD_OFFICER') and principal != null && @verificationServiceImpl.getVerificationByApplicationId(#applicationId).fieldOfficer != null && @verificationServiceImpl.getVerificationByApplicationId(#applicationId).fieldOfficer.username == principal.username)")
    public ResponseEntity<BaseResponse<VerificationDto>> getVerification(
            @Parameter(description = "Application primary key", example = "1", required = true)
            @PathVariable Long applicationId) {

        VerificationDto result = verificationService.getVerificationByApplicationId(applicationId);
        return ResponseEntity.ok(BaseResponse.success(result, "Verification record retrieved successfully."));
    }

    // =========================================================================
    // GET …/history — Get Full Audit Trail
    // =========================================================================

    @GetMapping("/history")
    @Operation(
            summary = "Get full verification audit trail for an application",
            description = "Returns all VerificationHistory entries for the application's verification record, " +
                    "ordered oldest-first. Useful for compliance and debugging."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Audit history retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "Application not found or no verification record exists")
    })
    @PreAuthorize("hasAnyRole('ADMIN', 'DISTRICT_OFFICER', 'FINANCE_OFFICER') or (hasRole('FIELD_OFFICER') and principal != null && @verificationServiceImpl.getVerificationByApplicationId(#applicationId).fieldOfficer != null && @verificationServiceImpl.getVerificationByApplicationId(#applicationId).fieldOfficer.username == principal.username)")
    public ResponseEntity<BaseResponse<List<VerificationHistoryDto>>> getVerificationHistory(
            @Parameter(description = "Application primary key", example = "1", required = true)
            @PathVariable Long applicationId) {

        List<VerificationHistoryDto> history = verificationService.getVerificationHistory(applicationId);
        return ResponseEntity.ok(BaseResponse.success(history,
                "Verification history retrieved successfully. Total entries: " + history.size()));
    }
}
