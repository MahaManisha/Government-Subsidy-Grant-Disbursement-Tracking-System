package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.*;
import com.gov.subsidy.service.RoutingService;
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

import java.util.List;

/**
 * REST controller for the Approval Routing Engine.
 *
 * <p>Base URL: {@code /api/v1/applications/{applicationId}/routing}</p>
 *
 * <p>Endpoints:
 * <ol>
 *   <li>POST  …/route            — Auto-route based on score, amount, priority</li>
 *   <li>POST  …/escalate         — Escalate to next officer level</li>
 *   <li>POST  …/reassign         — Reassign to a different officer</li>
 *   <li>POST  …/flag             — Manually flag as suspicious</li>
 *   <li>POST  …/reject           — Reject the routing (terminates workflow)</li>
 *   <li>GET   …/history          — Retrieve full routing audit trail</li>
 * </ol>
 * </p>
 */
@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/applications/{applicationId}/routing")
@Tag(
        name = "Approval Routing Engine",
        description = "Automatically assigns the appropriate officer to an application based on " +
                "eligibility score, requested amount, and priority level. " +
                "Routing Matrix: " +
                "isFlagged/CRITICAL/score<30 → FLAGGED | " +
                "score≥90 + amount<₹5L → FAST_TRACK (field officer) | " +
                "amount≥₹10L → FINANCE_REVIEW | " +
                "amount≥₹5L → DISTRICT_REVIEW | " +
                "otherwise → STANDARD (field officer). " +
                "Supports escalation, reassignment, flagging, and rejection. " +
                "Every decision is persisted as an auditable RoutingRecord."
)
public class RoutingController {

    private final RoutingService routingService;

    public RoutingController(RoutingService routingService) {
        this.routingService = routingService;
    }

    // =========================================================================
    // POST …/route — Auto-Route Application
    // =========================================================================

    @PostMapping("/route")
    @Operation(
            summary = "Auto-route an application to the appropriate officer",
            description = """
                    Runs the Approval Routing Engine for the specified application.

                    **Routing Decision Matrix (all thresholds configurable via `routing.*` properties):**
                    | Condition                                           | Decision        | Officer Type      |
                    |-----------------------------------------------------|-----------------|-------------------|
                    | `isFlagged = true`                                  | FLAGGED         | None (manual)     |
                    | `priority = CRITICAL`                               | FLAGGED         | None (manual)     |
                    | `eligibilityScore < 30`                             | FLAGGED         | None (manual)     |
                    | `score >= 90` AND `amount < ₹5,00,000`             | FAST_TRACK      | Field Officer     |
                    | `amount >= ₹10,00,000` (10 Lakhs)                  | FINANCE_REVIEW  | Finance Officer   |
                    | `amount >= ₹5,00,000` (5 Lakhs)                    | DISTRICT_REVIEW | District Officer  |
                    | otherwise                                           | STANDARD        | Field Officer     |

                    **Officer Selection:** Least-loaded active officer with the required role
                    (load-balanced automatically). If no officer is available, the application is FLAGGED.

                    **Side effects:**
                    - `Application.assignedOfficer` is updated
                    - `Application.workflowStatus` → `UNDER_REVIEW`
                    - `Application.currentStage` updated to match decision
                    - A `RoutingRecord` is persisted with full rationale
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Routing completed successfully",
                    content = @Content(mediaType = "application/json",
                            examples = {
                                    @ExampleObject(name = "FAST_TRACK – Score 92, Amount ₹25,000",
                                            value = """
                                                    {
                                                      "success": true,
                                                      "message": "Application routed successfully.",
                                                      "data": {
                                                        "decision": "FAST_TRACK",
                                                        "assignedOfficer": { "id": 10, "username": "officer.ramesh", "firstName": "Ramesh" },
                                                        "rationale": "Score 92 >= fast-track threshold 90 and amount ₹25000 < high threshold ₹500000. Fast-tracked to field officer.",
                                                        "application": {
                                                          "applicationNumber": "APP-2026-000001",
                                                          "workflowStatus": "UNDER_REVIEW",
                                                          "currentStage": "FIELD_VERIFICATION",
                                                          "eligibilityScore": 92
                                                        },
                                                        "routingHistory": [
                                                          { "decision": "FAST_TRACK", "scoreAtRouting": 92, "amountAtRouting": 25000.00, "autoRouted": true, "routedAt": "2026-07-09T19:15:00" }
                                                        ]
                                                      },
                                                      "timestamp": "2026-07-09T19:15:00"
                                                    }
                                                    """
                                    ),
                                    @ExampleObject(name = "FINANCE_REVIEW – Amount ₹12,00,000",
                                            value = """
                                                    {
                                                      "success": true,
                                                      "message": "Application routed successfully.",
                                                      "data": {
                                                        "decision": "FINANCE_REVIEW",
                                                        "assignedOfficer": { "id": 30, "username": "finance.priya", "firstName": "Priya" },
                                                        "rationale": "Requested amount ₹1200000 >= very-high threshold ₹1000000. Routed directly to Finance Officer.",
                                                        "application": { "workflowStatus": "UNDER_REVIEW", "currentStage": "FINANCE_REVIEW" },
                                                        "routingHistory": [{ "decision": "FINANCE_REVIEW", "autoRouted": true }]
                                                      },
                                                      "timestamp": "2026-07-09T19:15:00"
                                                    }
                                                    """
                                    ),
                                    @ExampleObject(name = "FLAGGED – Suspicious Score",
                                            value = """
                                                    {
                                                      "success": true,
                                                      "message": "Application routed successfully.",
                                                      "data": {
                                                        "decision": "FLAGGED",
                                                        "assignedOfficer": null,
                                                        "rationale": "Eligibility score 15 is below suspicious threshold 30. Flagged for manual review.",
                                                        "application": { "isFlagged": true, "workflowStatus": "UNDER_REVIEW" },
                                                        "routingHistory": [{ "decision": "FLAGGED", "autoRouted": true }]
                                                      },
                                                      "timestamp": "2026-07-09T19:15:00"
                                                    }
                                                    """
                                    )
                            }
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Application is not in a routable state"),
            @ApiResponse(responseCode = "404", description = "Application not found")
    })
    public ResponseEntity<BaseResponse<RoutingResponseDto>> routeApplication(
            @Parameter(description = "Application primary key", example = "1", required = true)
            @PathVariable Long applicationId) {

        RoutingResponseDto result = routingService.routeApplication(applicationId);
        return ResponseEntity.ok(BaseResponse.success(result, "Application routed successfully."));
    }

    // =========================================================================
    // POST …/escalate — Escalate to Next Level
    // =========================================================================

    @PostMapping("/escalate")
    @Operation(
            summary = "Escalate application to the next officer level",
            description = """
                    Escalates the application to a higher review level.

                    **Escalation path:**
                    - FIELD_VERIFICATION / INITIATION → DISTRICT_REVIEW (District Officer)
                    - DISTRICT_REVIEW → FINANCE_REVIEW (Finance Officer)
                    - FINANCE_REVIEW → Error (already at highest level)

                    **Officer Selection:** If `escalateToOfficerId` is not specified,
                    the least-loaded active officer at the next level is auto-selected.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Application escalated successfully",
                    content = @Content(mediaType = "application/json",
                            examples = @ExampleObject(name = "ESCALATED",
                                    value = """
                                            {
                                              "success": true,
                                              "message": "Application escalated successfully.",
                                              "data": {
                                                "decision": "ESCALATED",
                                                "assignedOfficer": { "id": 20, "username": "district.meena" },
                                                "rationale": "Escalated by officer ID 10. Path: FIELD_VERIFICATION → DISTRICT_REVIEW. Assigned to Meena Sharma (ID 20).",
                                                "application": { "currentStage": "DISTRICT_REVIEW", "workflowStatus": "UNDER_REVIEW" },
                                                "routingHistory": [
                                                  { "decision": "STANDARD",   "autoRouted": true  },
                                                  { "decision": "ESCALATED",  "autoRouted": false }
                                                ]
                                              },
                                              "timestamp": "2026-07-09T19:20:00"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Already at highest level or invalid state"),
            @ApiResponse(responseCode = "404", description = "Application or officer not found")
    })
    public ResponseEntity<BaseResponse<RoutingResponseDto>> escalate(
            @Parameter(description = "Application primary key", example = "1", required = true)
            @PathVariable Long applicationId,
            @Valid @RequestBody EscalateRequestDto request) {

        RoutingResponseDto result = routingService.escalate(applicationId, request);
        return ResponseEntity.ok(BaseResponse.success(result, "Application escalated successfully."));
    }

    // =========================================================================
    // POST …/reassign — Reassign to Different Officer
    // =========================================================================

    @PostMapping("/reassign")
    @Operation(
            summary = "Reassign application to a different officer",
            description = """
                    Reassigns the application to a specified officer.
                    Used when the current assignee is unavailable or the application needs
                    a different officer at the **same** level.

                    Unlike escalation, reassignment keeps the application at the same stage.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Application reassigned successfully",
                    content = @Content(mediaType = "application/json",
                            examples = @ExampleObject(name = "REASSIGNED",
                                    value = """
                                            {
                                              "success": true,
                                              "message": "Application reassigned successfully.",
                                              "data": {
                                                "decision": "REASSIGNED",
                                                "assignedOfficer": { "id": 15, "username": "officer.kavya" },
                                                "rationale": "Reassigned by officer ID 10 from Ramesh Kumar to Kavya Nair (ID 15). Reason: Officer on leave.",
                                                "application": { "currentStage": "FIELD_VERIFICATION", "workflowStatus": "UNDER_REVIEW" },
                                                "routingHistory": [
                                                  { "decision": "STANDARD",    "autoRouted": true  },
                                                  { "decision": "REASSIGNED",  "autoRouted": false }
                                                ]
                                              },
                                              "timestamp": "2026-07-09T19:20:00"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(responseCode = "404", description = "Application or target officer not found")
    })
    public ResponseEntity<BaseResponse<RoutingResponseDto>> reassign(
            @Parameter(description = "Application primary key", example = "1", required = true)
            @PathVariable Long applicationId,
            @Valid @RequestBody ReassignRequestDto request) {

        RoutingResponseDto result = routingService.reassign(applicationId, request);
        return ResponseEntity.ok(BaseResponse.success(result, "Application reassigned successfully."));
    }

    // =========================================================================
    // POST …/flag — Flag as Suspicious
    // =========================================================================

    @PostMapping("/flag")
    @Operation(
            summary = "Manually flag an application as suspicious",
            description = """
                    Marks the application as suspicious for human review.

                    **Side effects:**
                    - `Application.isFlagged` → `true`
                    - A FLAGGED `RoutingRecord` is appended
                    - `Application.assignedOfficer` is cleared (null)

                    The application remains in UNDER_REVIEW status and must be manually resolved
                    (reassign or reject) by an administrator.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Application flagged as suspicious",
                    content = @Content(mediaType = "application/json",
                            examples = @ExampleObject(name = "FLAGGED – Manual",
                                    value = """
                                            {
                                              "success": true,
                                              "message": "Application flagged as suspicious.",
                                              "data": {
                                                "decision": "FLAGGED",
                                                "assignedOfficer": null,
                                                "rationale": "Manually flagged as suspicious by officer ID 10. Reason: Duplicate Aadhaar detected.",
                                                "application": { "isFlagged": true },
                                                "routingHistory": [
                                                  { "decision": "STANDARD", "autoRouted": true  },
                                                  { "decision": "FLAGGED",  "autoRouted": false }
                                                ]
                                              },
                                              "timestamp": "2026-07-09T19:25:00"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(responseCode = "404", description = "Application or officer not found")
    })
    public ResponseEntity<BaseResponse<RoutingResponseDto>> flagSuspicious(
            @Parameter(description = "Application primary key", example = "1", required = true)
            @PathVariable Long applicationId,
            @Valid @RequestBody FlagRequestDto request) {

        RoutingResponseDto result = routingService.flagSuspicious(applicationId, request);
        return ResponseEntity.ok(BaseResponse.success(result, "Application flagged as suspicious."));
    }

    // =========================================================================
    // POST …/reject — Reject the Routing (Close Application)
    // =========================================================================

    @PostMapping("/reject")
    @Operation(
            summary = "Reject routing — terminates the application",
            description = """
                    Rejects the application outright at the routing stage.

                    **Side effects:**
                    - `Application.workflowStatus` → `REJECTED`
                    - `Application.isFlagged` → `true`
                    - `Application.rejectionReason` is set from `rejectionReason` or `remarks`
                    - A REJECTED `RoutingRecord` is appended

                    **Note:** This is a terminal state. The application cannot be re-routed
                    after rejection. A new application must be submitted instead.

                    **Note:** Disbursement is not affected (no disbursement module yet).
                    """,
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Use officerId for the rejecting officer, remarks for the reason, " +
                            "rejectionReason for the official rejection reason. " +
                            "action field is not used (can be any string).",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    value = """
                                            {
                                              "officerId": 10,
                                              "action": "REJECT",
                                              "remarks": "Verified documents are fraudulent. Refer to police.",
                                              "rejectionReason": "Fraudulent documentation submitted."
                                            }
                                            """
                            )
                    )
            )
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Application rejected at routing stage",
                    content = @Content(mediaType = "application/json",
                            examples = @ExampleObject(name = "REJECTED",
                                    value = """
                                            {
                                              "success": true,
                                              "message": "Application routing rejected.",
                                              "data": {
                                                "decision": "REJECTED",
                                                "assignedOfficer": null,
                                                "rationale": "Routing rejected by officer ID 10. Reason: Fraudulent documentation.",
                                                "application": {
                                                  "workflowStatus": "REJECTED",
                                                  "isFlagged": true,
                                                  "rejectionReason": "Fraudulent documentation submitted."
                                                }
                                              },
                                              "timestamp": "2026-07-09T19:30:00"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Missing required remarks"),
            @ApiResponse(responseCode = "404", description = "Application or officer not found")
    })
    public ResponseEntity<BaseResponse<RoutingResponseDto>> rejectRouting(
            @Parameter(description = "Application primary key", example = "1", required = true)
            @PathVariable Long applicationId,
            @Valid @RequestBody VerificationActionRequestDto request) {

        RoutingResponseDto result = routingService.rejectRouting(applicationId, request);
        return ResponseEntity.ok(BaseResponse.success(result, "Application routing rejected."));
    }

    // =========================================================================
    // GET …/history — Full Routing Audit Trail
    // =========================================================================

    @GetMapping("/history")
    @Operation(
            summary = "Get full routing audit trail for an application",
            description = "Returns all RoutingRecord entries for the application in chronological order " +
                    "(oldest first). Includes both automatic routing decisions and manual actions " +
                    "(escalate, reassign, flag, reject). Useful for compliance and audit purposes."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Routing history retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "Application not found")
    })
    public ResponseEntity<BaseResponse<List<RoutingRecordDto>>> getRoutingHistory(
            @Parameter(description = "Application primary key", example = "1", required = true)
            @PathVariable Long applicationId) {

        List<RoutingRecordDto> history = routingService.getRoutingHistory(applicationId);
        return ResponseEntity.ok(BaseResponse.success(history,
                "Routing history retrieved. Total records: " + history.size()));
    }
}
