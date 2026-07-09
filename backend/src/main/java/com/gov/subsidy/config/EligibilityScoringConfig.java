package com.gov.subsidy.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Externally configurable parameters for the Eligibility Scoring Engine.
 *
 * <p>All rule weights and thresholds are loaded from {@code application.properties}
 * under the {@code eligibility.scoring} prefix. This makes the engine fully
 * reconfigurable without recompilation.</p>
 *
 * <p>Default values (applied when properties are absent) match the specification:
 * <ul>
 *   <li>Income below 2,00,000 (2 Lakhs) → +40 points</li>
 *   <li>SC or ST category             → +20 points</li>
 *   <li>Women (FEMALE gender)         → +10 points</li>
 *   <li>Senior Citizen (age ≥ 60)     → +10 points</li>
 *   <li>Documents complete (VERIFIED) → +20 points</li>
 *   <li>Score ≥ 80                    → ELIGIBLE, otherwise REJECTED</li>
 * </ul>
 * </p>
 */
@Configuration
@ConfigurationProperties(prefix = "eligibility.scoring")
public class EligibilityScoringConfig {

    /** Annual income ceiling (inclusive) for the income-based rule. Default: 2,00,000. */
    private long incomeThreshold = 200_000L;

    /** Score awarded when annual income is strictly below the income threshold. Default: 40. */
    private int incomeScore = 40;

    /** Score awarded when the beneficiary belongs to SC or ST category. Default: 20. */
    private int scStScore = 20;

    /** Score awarded when the beneficiary's gender is FEMALE. Default: 10. */
    private int womenScore = 10;

    /** Minimum age (in years, inclusive) to qualify as a Senior Citizen. Default: 60. */
    private int seniorCitizenAge = 60;

    /** Score awarded when the beneficiary qualifies as a Senior Citizen. Default: 10. */
    private int seniorCitizenScore = 10;

    /**
     * Score awarded when the beneficiary's {@code eligibilityStatus} is {@code VERIFIED},
     * indicating all required documents have been submitted and verified. Default: 20.
     */
    private int documentsScore = 20;

    /** Minimum total score (inclusive) required to be considered ELIGIBLE. Default: 80. */
    private int eligibleThreshold = 80;

    // =========================================================================
    // Getters & Setters (required by @ConfigurationProperties binding)
    // =========================================================================

    public long getIncomeThreshold() { return incomeThreshold; }
    public void setIncomeThreshold(long incomeThreshold) { this.incomeThreshold = incomeThreshold; }

    public int getIncomeScore() { return incomeScore; }
    public void setIncomeScore(int incomeScore) { this.incomeScore = incomeScore; }

    public int getScStScore() { return scStScore; }
    public void setScStScore(int scStScore) { this.scStScore = scStScore; }

    public int getWomenScore() { return womenScore; }
    public void setWomenScore(int womenScore) { this.womenScore = womenScore; }

    public int getSeniorCitizenAge() { return seniorCitizenAge; }
    public void setSeniorCitizenAge(int seniorCitizenAge) { this.seniorCitizenAge = seniorCitizenAge; }

    public int getSeniorCitizenScore() { return seniorCitizenScore; }
    public void setSeniorCitizenScore(int seniorCitizenScore) { this.seniorCitizenScore = seniorCitizenScore; }

    public int getDocumentsScore() { return documentsScore; }
    public void setDocumentsScore(int documentsScore) { this.documentsScore = documentsScore; }

    public int getEligibleThreshold() { return eligibleThreshold; }
    public void setEligibleThreshold(int eligibleThreshold) { this.eligibleThreshold = eligibleThreshold; }
}
