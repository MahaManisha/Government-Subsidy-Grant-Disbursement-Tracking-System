package com.gov.subsidy.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * SLA (Service Level Agreement) timeout configuration for each workflow stage.
 *
 * <p>Values are loaded from {@code application.properties} under {@code workflow.sla.*}.
 * Each value specifies the maximum number of hours an application may remain
 * in that stage before the escalation/timeout job fires.</p>
 *
 * <p>Default SLA periods:
 * <pre>
 *   FIELD_VERIFICATION   — 48 hours (2 business days)
 *   DISTRICT_REVIEW      — 72 hours (3 business days)
 *   FINANCE_REVIEW       — 96 hours (4 business days)
 *   RE_VERIFICATION      — 24 hours (1 business day)
 *   INITIATION (routing) — 24 hours (1 business day)
 * </pre>
 * </p>
 */
@Configuration
@ConfigurationProperties(prefix = "workflow.sla")
public class WorkflowSlaConfig {

    /** Max hours at FIELD_VERIFICATION before SLA breach. Default: 48h. */
    private int fieldVerificationHours = 48;

    /** Max hours at DISTRICT_REVIEW before SLA breach. Default: 72h. */
    private int districtReviewHours = 72;

    /** Max hours at FINANCE_REVIEW before SLA breach. Default: 96h. */
    private int financeReviewHours = 96;

    /** Max hours in RE_VERIFICATION_REQUESTED before auto-escalation. Default: 24h. */
    private int reVerificationHours = 24;

    /** Max hours at INITIATION (awaiting routing) before SLA breach. Default: 24h. */
    private int initiationHours = 24;

    /** Cron expression for the timeout scanner job. Default: every 30 minutes. */
    private String timeoutScannerCron = "0 */30 * * * *";

    // ── Getters & Setters (required by @ConfigurationProperties) ─────────────

    public int getFieldVerificationHours() { return fieldVerificationHours; }
    public void setFieldVerificationHours(int v) { this.fieldVerificationHours = v; }

    public int getDistrictReviewHours() { return districtReviewHours; }
    public void setDistrictReviewHours(int v) { this.districtReviewHours = v; }

    public int getFinanceReviewHours() { return financeReviewHours; }
    public void setFinanceReviewHours(int v) { this.financeReviewHours = v; }

    public int getReVerificationHours() { return reVerificationHours; }
    public void setReVerificationHours(int v) { this.reVerificationHours = v; }

    public int getInitiationHours() { return initiationHours; }
    public void setInitiationHours(int v) { this.initiationHours = v; }

    public String getTimeoutScannerCron() { return timeoutScannerCron; }
    public void setTimeoutScannerCron(String v) { this.timeoutScannerCron = v; }
}
