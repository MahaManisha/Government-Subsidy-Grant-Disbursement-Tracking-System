package com.gov.subsidy.service;

import com.gov.subsidy.dto.*;

import java.util.List;

/**
 * Service interface for the Approval Routing Engine.
 *
 * <p>The engine evaluates each submitted application against configurable
 * thresholds and makes an automatic routing decision. After auto-routing,
 * officers can escalate, reassign, flag, or reject via manual operations.</p>
 *
 * <p><b>Auto-Routing Matrix (configurable via {@code routing.*} properties):</b>
 * <pre>
 *   CRITICAL priority or isFlagged=true          → FLAGGED
 *   score &lt; suspiciousScoreThreshold (30)         → FLAGGED
 *   score &gt;= fastTrackScore (90) + amount &lt; high → FAST_TRACK (field officer, expedited)
 *   amount &gt;= veryHighAmount (₹10L)               → FINANCE_REVIEW (finance officer)
 *   amount &gt;= highAmount (₹5L)                    → DISTRICT_REVIEW (district officer)
 *   otherwise                                     → STANDARD (field officer)
 * </pre>
 * </p>
 */
public interface RoutingService {

    /**
     * Automatically route an application based on eligibility score,
     * requested amount, and priority.
     *
     * <p>The engine selects the least-loaded officer of the appropriate role
     * (load-balancing). The decision and rationale are persisted as a
     * {@link com.gov.subsidy.entity.RoutingRecord}.</p>
     *
     * @param applicationId the application to route
     * @return full routing response including decision, officer, rationale, and history
     * @throws com.gov.subsidy.exception.ResourceNotFoundException if application not found
     * @throws com.gov.subsidy.exception.InvalidWorkflowTransitionException if application
     *         is not in SUBMITTED or UNDER_REVIEW state
     */
    RoutingResponseDto routeApplication(Long applicationId);

    /**
     * Escalate an application to a higher officer level.
     *
     * <p>Escalation order: FIELD_OFFICER → DISTRICT_OFFICER → FINANCE_OFFICER.
     * If {@code escalateToOfficerId} is specified, that officer is used directly;
     * otherwise the least-loaded officer at the next level is auto-selected.</p>
     *
     * @param applicationId the application to escalate
     * @param request       escalation details including actioning officer and optional target
     * @return updated routing response with ESCALATED decision
     */
    RoutingResponseDto escalate(Long applicationId, EscalateRequestDto request);

    /**
     * Reassign an application to a different officer at the same level.
     *
     * @param applicationId the application to reassign
     * @param request       reassignment details including actioning officer and target officer
     * @return updated routing response with REASSIGNED decision
     */
    RoutingResponseDto reassign(Long applicationId, ReassignRequestDto request);

    /**
     * Manually flag an application as suspicious for manual review.
     *
     * <p>Sets {@code Application.isFlagged = true} and persists a FLAGGED routing record.</p>
     *
     * @param applicationId the application to flag
     * @param request       flag details including reason
     * @return updated routing response with FLAGGED decision
     */
    RoutingResponseDto flagSuspicious(Long applicationId, FlagRequestDto request);

    /**
     * Reject the routing of an application (terminates the application workflow).
     *
     * <p>Sets {@code Application.workflowStatus = REJECTED}.</p>
     *
     * @param applicationId the application to reject
     * @param request       rejection details including actioning officer and reason
     * @return updated routing response with REJECTED decision
     */
    RoutingResponseDto rejectRouting(Long applicationId, VerificationActionRequestDto request);

    /**
     * Retrieve the complete routing audit trail for an application.
     *
     * @param applicationId the application ID
     * @return all routing records in chronological order (oldest first)
     */
    List<RoutingRecordDto> getRoutingHistory(Long applicationId);
}
