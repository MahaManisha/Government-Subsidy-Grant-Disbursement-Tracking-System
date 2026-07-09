package com.gov.subsidy.enums;

/**
 * Represents the routing decision produced by the Approval Routing Engine
 * for a given application.
 *
 * <ul>
 *   <li>{@code FAST_TRACK}     — Score ≥ fast-track threshold and amount below standard limit.
 *                                Application is expedited; assigned directly to a field officer
 *                                with minimal review overhead.</li>
 *   <li>{@code STANDARD}       — Normal routing; assigned to a field officer for standard
 *                                field verification.</li>
 *   <li>{@code DISTRICT_REVIEW} — High-value application (amount ≥ highAmountThreshold);
 *                                 routed to a district officer.</li>
 *   <li>{@code FINANCE_REVIEW} — Very-high-value application (amount ≥ veryHighAmountThreshold);
 *                                routed directly to a finance officer.</li>
 *   <li>{@code FLAGGED}        — Application is suspicious (CRITICAL priority, low score, or
 *                                manually flagged); placed under manual review.</li>
 *   <li>{@code ESCALATED}      — Manually escalated from one officer level to the next.</li>
 *   <li>{@code REASSIGNED}     — Manually reassigned to a different officer of the same role.</li>
 *   <li>{@code REJECTED}       — Routing decision is rejected; application is closed.</li>
 * </ul>
 */
public enum RoutingDecision {
    FAST_TRACK,
    STANDARD,
    DISTRICT_REVIEW,
    FINANCE_REVIEW,
    FLAGGED,
    ESCALATED,
    REASSIGNED,
    REJECTED
}
