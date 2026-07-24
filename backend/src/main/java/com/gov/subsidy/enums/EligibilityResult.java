package com.gov.subsidy.enums;

/**
 * Represents the final outcome of the eligibility scoring engine
 * for a specific application.
 *
 * <ul>
 *   <li>{@code ELIGIBLE}  — Total score >= configured threshold (default 80). Application may proceed.</li>
 *   <li>{@code REJECTED}  — Total score < configured threshold. Application is ineligible.</li>
 *   <li>{@code PENDING}   — Scoring has not yet been performed for this application.</li>
 * </ul>
 */
public enum EligibilityResult {
    ELIGIBLE,
    REJECTED,
    PENDING,
    NOT_ELIGIBLE
}
