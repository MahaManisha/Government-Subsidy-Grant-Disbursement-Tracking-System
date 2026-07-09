package com.gov.subsidy.enums;

/**
 * Event types recorded in the Workflow Audit Log.
 * Each value represents one atomic transition or action in the automation engine.
 */
public enum WorkflowEvent {

    // ── Automated Stage Transitions ──────────────────────────────────────────
    AUTO_SUBMITTED,             // Application submitted, enters workflow
    AUTO_ROUTED,                // Routing engine assigned an officer
    AUTO_FIELD_VERIFIED,        // All field checks passed → advance to DISTRICT_REVIEW
    AUTO_DISTRICT_APPROVED,     // District review passed → advance to FINANCE_REVIEW
    AUTO_FINANCE_APPROVED,      // Finance review passed → advance to READY_FOR_DISBURSEMENT
    AUTO_READY_FOR_DISBURSEMENT, // Application marked ready for fund transfer

    // ── Re-verification ───────────────────────────────────────────────────────
    REVERIFICATION_TRIGGERED,   // Re-verification was requested (manually or by escalation)
    REVERIFICATION_RESET,       // Application reset to FIELD_VERIFICATION after re-verify request

    // ── Escalation ────────────────────────────────────────────────────────────
    ESCALATION_TRIGGERED,       // Escalation performed (manual or SLA-driven)
    SLA_BREACH_DETECTED,        // SLA timeout detected by scheduler

    // ── Rejection ────────────────────────────────────────────────────────────
    APPLICATION_REJECTED,       // Application was rejected at any stage

    // ── Notification ─────────────────────────────────────────────────────────
    NOTIFICATION_SENT,          // Notification placeholder fired

    // ── Manual Override ───────────────────────────────────────────────────────
    MANUAL_STAGE_OVERRIDE       // Admin forced a stage transition
}
