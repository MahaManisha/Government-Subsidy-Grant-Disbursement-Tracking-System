package com.gov.subsidy.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Externally configurable thresholds for the Approval Routing Engine.
 *
 * <p>All values are loaded from {@code application.properties} under the
 * {@code routing.*} prefix. Changing any threshold requires only a property
 * update — no recompilation needed.</p>
 *
 * <p>Default Routing Matrix:
 * <pre>
 *  ┌─────────────────────────────────────────┬──────────────────────────────┐
 *  │ Condition                               │ Decision                     │
 *  ├─────────────────────────────────────────┼──────────────────────────────┤
 *  │ CRITICAL priority                       │ FLAGGED (always)             │
 *  │ isFlagged = true                        │ FLAGGED (always)             │
 *  │ score < suspiciousScoreThreshold (30)   │ FLAGGED                      │
 *  │ score >= fastTrackScore (90)            │ FAST_TRACK (if amount < high)│
 *  │ amount >= veryHighAmount (10,00,000)    │ FINANCE_REVIEW               │
 *  │ amount >= highAmount (5,00,000)         │ DISTRICT_REVIEW              │
 *  │ otherwise                               │ STANDARD                     │
 *  └─────────────────────────────────────────┴──────────────────────────────┘
 * </pre>
 * </p>
 */
@Configuration
@ConfigurationProperties(prefix = "routing")
public class RoutingConfig {

    // ── Fast-track threshold ──────────────────────────────────────────────────

    /** Minimum eligibility score to qualify for fast-track routing. Default: 90. */
    private int fastTrackScoreThreshold = 90;

    // ── Amount thresholds ─────────────────────────────────────────────────────

    /**
     * Requested amounts equal to or above this value are routed to a
     * District Officer for review. Default: ₹5,00,000 (5 Lakhs).
     */
    private long highAmountThreshold = 500_000L;

    /**
     * Requested amounts equal to or above this value are routed directly to a
     * Finance Officer. Default: ₹10,00,000 (10 Lakhs).
     */
    private long veryHighAmountThreshold = 1_000_000L;

    // ── Suspicion detection ───────────────────────────────────────────────────

    /**
     * Applications with an eligibility score strictly below this value are
     * considered suspicious and flagged for manual review. Default: 30.
     */
    private int suspiciousScoreThreshold = 30;

    // ── Getters & Setters (required by @ConfigurationProperties) ─────────────

    public int getFastTrackScoreThreshold() { return fastTrackScoreThreshold; }
    public void setFastTrackScoreThreshold(int fastTrackScoreThreshold) {
        this.fastTrackScoreThreshold = fastTrackScoreThreshold;
    }

    public long getHighAmountThreshold() { return highAmountThreshold; }
    public void setHighAmountThreshold(long highAmountThreshold) {
        this.highAmountThreshold = highAmountThreshold;
    }

    public long getVeryHighAmountThreshold() { return veryHighAmountThreshold; }
    public void setVeryHighAmountThreshold(long veryHighAmountThreshold) {
        this.veryHighAmountThreshold = veryHighAmountThreshold;
    }

    public int getSuspiciousScoreThreshold() { return suspiciousScoreThreshold; }
    public void setSuspiciousScoreThreshold(int suspiciousScoreThreshold) {
        this.suspiciousScoreThreshold = suspiciousScoreThreshold;
    }
}
