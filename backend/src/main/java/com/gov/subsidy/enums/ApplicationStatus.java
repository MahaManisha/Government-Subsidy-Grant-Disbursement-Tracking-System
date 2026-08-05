package com.gov.subsidy.enums;

/**
 * Top-level status of a subsidy application.
 *
 * <p>Progression (happy path):
 * SUBMITTED → UNDER_REVIEW → APPROVED → READY_FOR_DISBURSEMENT → DISBURSED</p>
 * <p>Terminal rejection states: REJECTED, RE_VERIFICATION_REQUESTED</p>
 */
public enum ApplicationStatus {
    SUBMITTED,
    UNDER_REVIEW,
    RE_VERIFICATION_REQUESTED,
    APPROVED,
    READY_FOR_DISBURSEMENT,
    REJECTED,
    DISBURSED,
    ELIGIBILITY_VERIFIED,
    ELIGIBILITY_REJECTED,
    FIELD_VERIFIED,
    FIELD_REJECTED,
    DOCUMENTS_REQUIRED,
    DISTRICT_APPROVED,
    DISTRICT_REJECTED,
    FINANCE_APPROVED,
    FINANCE_REJECTED
}
