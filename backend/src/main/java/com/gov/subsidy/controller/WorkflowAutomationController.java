package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.*;
import com.gov.subsidy.service.WorkflowAutomationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

/**
 * REST controller for the Workflow Automation Engine.
 *
 * <p>Base URL: {@code /api/v1/applications/{applicationId}/workflow}</p>
 *
 * <p>Endpoints:
 * <ol>
 *   <li>POST …/advance           — Advance to next stage</li>
 *   <li>POST …/escalate          — Trigger escalation</li>
 *   <li>POST …/reverify          — Trigger re-verification reset</li>
 *   <li>POST …/timeout           — Manually trigger SLA timeout handling</li>
 *   <li>POST …/ready-for-disbursement — Mark APPROVED application as ready</li>
 *   <li>GET  …/audit-trail       — Full workflow audit trail</li>
 * </ol>
 * </p>
 */
@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/applications/{applicationId}/workflow")
@Tag(
        name = "Workflow Automation",
        description = "Drives automatic stage progression through the subsidy approval lifecycle. " +
                "Pipeline: SUBMITTED → FIELD_VERIFICATION → DISTRICT_REVIEW → " +
                "FINANCE_REVIEW → APPROVED → READY_FOR_DISBURSEMENT. " +
                "Supports escalation, re-verification, SLA timeout handling, " +
                "and a full append-only audit trail. No fund transfer is performed."
)
public class WorkflowAutomationController {

    private final WorkflowAutomationService automationService;

    public WorkflowAutomationController(WorkflowAutomationService automationService) {
        this.automationService = automationService;
    }

    // =========================================================================
    // POST …/advance — Advance to Next Stage
    // =========================================================================

    @PostMapping("/advance")
    @Operation(
            summary = "Advance application to the next workflow stage",
            description = """
                    Moves the application forward by one stage in the pipeline.

                    **Stage progression:**
                    | Current Stage        | Next Stage       | Status change            |
                    |----------------------|------------------|--------------------------|
                    | INITIATION           | FIELD_VERIFICATION | SUBMITTED → UNDER_REVIEW |
                    | FIELD_VERIFICATION   | DISTRICT_REVIEW  | stays UNDER_REVIEW       |
                    | DISTRICT_REVIEW      | FINANCE_REVIEW   | stays UNDER_REVIEW       |
                    | FINANCE_REVIEW       | COMPLETED        | UNDER_REVIEW → APPROVED  |

                    **Side effects per call:**
                    - Application stage + status updated
                    - `WorkflowAuditLog` entry appended
                    - `VerificationHistory` entry appended (if Verification record exists)
                    - Beneficiary + Officer notifications fired (placeholder)
                    - `approvedDate` set when FINANCE_REVIEW completes

                    After FINANCE_REVIEW is advanced (status=APPROVED), call
                    `POST .../ready-for-disbursement` to complete the cycle.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Stage advanced successfully",
                    content = @Content(mediaType = "application/json",
                            examples = @ExampleObject(name = "FIELD → DISTRICT",
                                    value = """
                                            {
                                              "success": true,
                                              "message": "Workflow advanced successfully.",
                                              "data": {
                                                "event": "AUTO_FIELD_VERIFIED",
                                                "summary": "Field verification complete. Advancing to DISTRICT_REVIEW.",
                                                "application": {
                                                  "applicationNumber": "APP-2026-000001",
                                                  "workflowStatus": "UNDER_REVIEW",
                                                  "currentStage": "DISTRICT_REVIEW"
                                                },
                                                "auditTrail": [
                                                  { "event": "AUTO_SUBMITTED",    "fromStage": "INITIATION",         "toStage": "FIELD_VERIFICATION", "automated": true },
                                                  { "event": "AUTO_FIELD_VERIFIED","fromStage": "FIELD_VERIFICATION", "toStage": "DISTRICT_REVIEW",   "automated": true }
                                                ]
                                              },
                                              "timestamp": "2026-07-09T20:07:46"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Application is in a non-advanceable stage"),
            @ApiResponse(responseCode = "404", description = "Application not found")
    })
    @PreAuthorize("hasAnyRole('ADMIN', 'FIELD_OFFICER', 'DISTRICT_OFFICER', 'FINANCE_OFFICER')")
    public ResponseEntity<BaseResponse<WorkflowAutomationResponseDto>> advanceWorkflow(
            @Parameter(description = "Application primary key", example = "1", required = true)
            @PathVariable Long applicationId,
            @RequestParam(defaultValue = "SYSTEM") String actor) {

        WorkflowAutomationResponseDto result = automationService.advanceWorkflow(applicationId, actor);
        return ResponseEntity.ok(BaseResponse.success(result, "Workflow advanced successfully."));
    }

    // =========================================================================
    // POST …/escalate — Trigger Escalation
    // =========================================================================

    @PostMapping("/escalate")
    @Operation(
            summary = "Trigger escalation to the next review level",
            description = """
                    Manually triggers an escalation for the specified application.
                    The engine moves it to the next level:
                    - FIELD_VERIFICATION → DISTRICT_REVIEW
                    - DISTRICT_REVIEW → FINANCE_REVIEW

                    **Side effects:**
                    - Stage updated, audit log appended, VerificationHistory updated
                    - Admin and officer notifications fired
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Escalation triggered successfully"),
            @ApiResponse(responseCode = "400", description = "Already at maximum review level")
    })
    @PreAuthorize("hasAnyRole('ADMIN', 'FIELD_OFFICER', 'DISTRICT_OFFICER', 'FINANCE_OFFICER')")
    public ResponseEntity<BaseResponse<WorkflowAutomationResponseDto>> escalate(
            @Parameter(description = "Application primary key", example = "1", required = true)
            @PathVariable Long applicationId,
            @RequestParam(defaultValue = "Manual escalation requested.") String reason) {

        WorkflowAutomationResponseDto result = automationService.triggerEscalation(applicationId, reason);
        return ResponseEntity.ok(BaseResponse.success(result, "Escalation triggered successfully."));
    }

    // =========================================================================
    // POST …/reverify — Trigger Re-verification
    // =========================================================================

    @PostMapping("/reverify")
    @Operation(
            summary = "Reset application to FIELD_VERIFICATION for re-verification",
            description = """
                    Resets the application back to `FIELD_VERIFICATION` stage with
                    status `RE_VERIFICATION_REQUESTED`.

                    **Side effects:**
                    - `reVerificationRequested` flag set to `true`
                    - Audit log + VerificationHistory appended
                    - Beneficiary and field officer notifications fired
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Re-verification triggered successfully"),
            @ApiResponse(responseCode = "404", description = "Application not found")
    })
    @PreAuthorize("hasAnyRole('ADMIN', 'FIELD_OFFICER', 'DISTRICT_OFFICER')")
    public ResponseEntity<BaseResponse<WorkflowAutomationResponseDto>> reVerify(
            @Parameter(description = "Application primary key", example = "1", required = true)
            @PathVariable Long applicationId,
            @RequestParam(defaultValue = "Re-verification requested by officer.") String reason) {

        WorkflowAutomationResponseDto result = automationService.triggerReVerification(applicationId, reason);
        return ResponseEntity.ok(BaseResponse.success(result, "Re-verification triggered successfully."));
    }

    // =========================================================================
    // POST …/timeout — Manually Trigger SLA Timeout
    // =========================================================================

    @PostMapping("/timeout")
    @Operation(
            summary = "Manually simulate an SLA timeout for an application",
            description = """
                    Triggers the SLA timeout handler for the specified application.
                    Normally this is called automatically by the `WorkflowTimeoutJob` scheduler
                    when an SLA is breached. This endpoint allows manual testing
                    or admin override of the timeout process.

                    **Side effects:**
                    - `SLA_BREACH_DETECTED` audit entry added
                    - Admin notification fired
                    - Automatic escalation triggered
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Timeout handled — application escalated"),
            @ApiResponse(responseCode = "404", description = "Application not found")
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BaseResponse<WorkflowAutomationResponseDto>> handleTimeout(
            @Parameter(description = "Application primary key", example = "1", required = true)
            @PathVariable Long applicationId) {

        WorkflowAutomationResponseDto result = automationService.handleTimeout(applicationId);
        return ResponseEntity.ok(BaseResponse.success(result, "SLA timeout handled. Application escalated."));
    }

    // =========================================================================
    // POST …/ready-for-disbursement — Mark as Ready
    // =========================================================================

    @PostMapping("/ready-for-disbursement")
    @Operation(
            summary = "Mark an APPROVED application as READY_FOR_DISBURSEMENT",
            description = """
                    Final step in the automated pipeline (before disbursement).
                    Transitions an `APPROVED` application to `READY_FOR_DISBURSEMENT`.

                    **Precondition:** Application must be in `APPROVED` status.

                    **Side effects:**
                    - `workflowStatus` → `READY_FOR_DISBURSEMENT`
                    - `currentStage` → `COMPLETED`
                    - `AUTO_READY_FOR_DISBURSEMENT` audit entry persisted
                    - Beneficiary notification fired

                    **Note:** No fund transfer is performed. That is a separate Disbursement module.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Application marked as READY_FOR_DISBURSEMENT",
                    content = @Content(mediaType = "application/json",
                            examples = @ExampleObject(name = "Ready",
                                    value = """
                                            {
                                              "success": true,
                                              "message": "Application marked as ready for disbursement.",
                                              "data": {
                                                "event": "AUTO_READY_FOR_DISBURSEMENT",
                                                "summary": "Application APP-2026-000001 is APPROVED and marked READY_FOR_DISBURSEMENT.",
                                                "application": {
                                                  "workflowStatus": "READY_FOR_DISBURSEMENT",
                                                  "currentStage": "COMPLETED"
                                                }
                                              },
                                              "timestamp": "2026-07-09T20:07:46"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Application is not in APPROVED status"),
            @ApiResponse(responseCode = "404", description = "Application not found")
    })
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE_OFFICER')")
    public ResponseEntity<BaseResponse<WorkflowAutomationResponseDto>> markReadyForDisbursement(
            @Parameter(description = "Application primary key", example = "1", required = true)
            @PathVariable Long applicationId) {

        WorkflowAutomationResponseDto result = automationService.markReadyForDisbursement(applicationId);
        return ResponseEntity.ok(BaseResponse.success(result, "Application marked as ready for disbursement."));
    }

    // =========================================================================
    // GET …/audit-trail — Full Workflow Audit Trail
    // =========================================================================

    @GetMapping("/audit-trail")
    @Operation(
            summary = "Get full workflow audit trail for an application",
            description = """
                    Returns every `WorkflowAuditLog` entry for the application in chronological order.
                    Each entry shows the event type, before/after status and stage snapshots,
                    the actor, human-readable description, SLA breach hours (if applicable),
                    and whether it was automated or manual.

                    This is the primary compliance and debugging endpoint for the Workflow Engine.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Audit trail retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "Application not found")
    })
    @PreAuthorize("hasAnyRole('ADMIN', 'FIELD_OFFICER', 'DISTRICT_OFFICER', 'FINANCE_OFFICER')")
    public ResponseEntity<BaseResponse<List<WorkflowAuditLogDto>>> getAuditTrail(
            @Parameter(description = "Application primary key", example = "1", required = true)
            @PathVariable Long applicationId) {

        List<WorkflowAuditLogDto> trail = automationService.getAuditTrail(applicationId);
        return ResponseEntity.ok(BaseResponse.success(trail,
                "Audit trail retrieved. Total events: " + trail.size()));
    }
}
