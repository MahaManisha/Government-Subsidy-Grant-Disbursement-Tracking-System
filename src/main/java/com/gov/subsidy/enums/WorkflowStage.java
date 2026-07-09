package com.gov.subsidy.enums;

/**
 * Represents each stage in the application verification pipeline.
 *
 * <p>Progression:
 * INITIATION → FIELD_VERIFICATION → DISTRICT_REVIEW → FINANCE_REVIEW → COMPLETED</p>
 * <p>Legacy stages DISTRICT_APPROVAL and FINANCIAL_DISBURSEMENT are kept for
 * backward compatibility.</p>
 */
public enum WorkflowStage {
    INITIATION,
    FIELD_VERIFICATION,
    DISTRICT_REVIEW,
    FINANCE_REVIEW,
    COMPLETED,
    /** @deprecated kept for backward compatibility */
    @Deprecated
    DISTRICT_APPROVAL,
    /** @deprecated kept for backward compatibility */
    @Deprecated
    FINANCIAL_DISBURSEMENT
}
