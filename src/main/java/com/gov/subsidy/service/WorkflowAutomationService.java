package com.gov.subsidy.service;

import com.gov.subsidy.dto.WorkflowAutomationResponseDto;
import com.gov.subsidy.dto.WorkflowAuditLogDto;

import java.util.List;

/**
 * Core orchestrator for the Workflow Automation Engine.
 *
 * <p>This service drives <em>automatic</em> stage progression — the engine
 * decides the next step based on the current application state and the
 * configured business rules. It also exposes manual triggers for
 * escalation, re-verification, and override scenarios.</p>
 *
 * <h3>Automated Lifecycle</h3>
 * <pre>
 *   SUBMITTED (INITIATION)
 *       │  advanceWorkflow()
 *       ▼
 *   UNDER_REVIEW (FIELD_VERIFICATION)
 *       │  advanceWorkflow()
 *       ▼
 *   UNDER_REVIEW (DISTRICT_REVIEW)
 *       │  advanceWorkflow()
 *       ▼
 *   UNDER_REVIEW (FINANCE_REVIEW)
 *       │  advanceWorkflow()
 *       ▼
 *   APPROVED → READY_FOR_DISBURSEMENT (COMPLETED)
 * </pre>
 *
 * <h3>Side-paths</h3>
 * <ul>
 *   <li>SLA breach → {@link #handleTimeout(Long)} — escalates or flags</li>
 *   <li>Re-verify   → {@link #triggerReVerification(Long, String)} — resets to FIELD_VERIFICATION</li>
 *   <li>Escalate    → {@link #triggerEscalation(Long, String)} — moves to next review level</li>
 * </ul>
 */
public interface WorkflowAutomationService {

    /**
     * Advance an application to the next logical workflow stage.
     *
     * <p>The engine inspects {@code currentStage} and moves forward:
     * INITIATION → FIELD_VERIFICATION → DISTRICT_REVIEW → FINANCE_REVIEW
     * → APPROVED → READY_FOR_DISBURSEMENT.</p>
     *
     * @param applicationId application to advance
     * @param actorUsername username of the person/system triggering the advance
     * @return the updated application state with the full audit trail
     */
    WorkflowAutomationResponseDto advanceWorkflow(Long applicationId, String actorUsername);

    /**
     * Trigger automatic escalation for an application.
     *
     * <p>Moves the application to the next review level and records an
     * {@code ESCALATION_TRIGGERED} audit entry. Also fires officer notification.</p>
     *
     * @param applicationId application to escalate
     * @param reason        explanation for the escalation (appears in audit log)
     * @return updated automation response
     */
    WorkflowAutomationResponseDto triggerEscalation(Long applicationId, String reason);

    /**
     * Reset the application to FIELD_VERIFICATION for re-verification.
     *
     * <p>Records a {@code REVERIFICATION_TRIGGERED} audit entry and notifies
     * both the beneficiary and the field officer.</p>
     *
     * @param applicationId application requiring re-verification
     * @param reason        explanation for the re-verification (appears in audit log)
     * @return updated automation response
     */
    WorkflowAutomationResponseDto triggerReVerification(Long applicationId, String reason);

    /**
     * Handle an SLA timeout for an application.
     *
     * <p>Called by the {@link com.gov.subsidy.scheduler.WorkflowTimeoutJob}.
     * Records an {@code SLA_BREACH_DETECTED} audit entry, notifies the admin,
     * and automatically escalates the application.</p>
     *
     * @param applicationId    application that has breached its SLA
     * @return updated automation response
     */
    WorkflowAutomationResponseDto handleTimeout(Long applicationId);

    /**
     * Mark an approved application as READY_FOR_DISBURSEMENT.
     *
     * <p>Records {@code AUTO_READY_FOR_DISBURSEMENT} and notifies the beneficiary.
     * No fund transfer is performed — that is a separate module.</p>
     *
     * @param applicationId the APPROVED application to mark ready
     * @return updated automation response
     */
    WorkflowAutomationResponseDto markReadyForDisbursement(Long applicationId);

    /**
     * Retrieve the full workflow audit trail for an application.
     *
     * @param applicationId the application ID
     * @return all audit log entries in chronological order
     */
    List<WorkflowAuditLogDto> getAuditTrail(Long applicationId);
}
