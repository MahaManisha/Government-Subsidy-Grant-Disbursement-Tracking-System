package com.gov.subsidy.eligibility;

/**
 * Immutable value object representing the outcome of a single eligibility rule evaluation.
 *
 * <p>Returned as part of the score breakdown in the API response so clients can see
 * exactly which rules contributed points to the final score.</p>
 */
public final class RuleResult {

    private final String ruleName;
    private final String description;
    private final int scoreAwarded;
    private final boolean passed;

    public RuleResult(String ruleName, String description, int scoreAwarded, boolean passed) {
        this.ruleName = ruleName;
        this.description = description;
        this.scoreAwarded = scoreAwarded;
        this.passed = passed;
    }

    /** @return the name of the rule that produced this result */
    public String getRuleName() { return ruleName; }

    /** @return the human-readable description of what the rule checks */
    public String getDescription() { return description; }

    /** @return the points awarded by this rule (0 if rule was not satisfied) */
    public int getScoreAwarded() { return scoreAwarded; }

    /** @return {@code true} if the beneficiary satisfied this rule's criterion */
    public boolean isPassed() { return passed; }

    @Override
    public String toString() {
        return "RuleResult{ruleName='" + ruleName + "', scoreAwarded=" + scoreAwarded + ", passed=" + passed + '}';
    }
}
