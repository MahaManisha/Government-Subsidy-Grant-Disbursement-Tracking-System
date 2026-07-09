package com.gov.subsidy.eligibility;

import com.gov.subsidy.entity.Beneficiary;

/**
 * Strategy interface for a single eligibility scoring rule.
 *
 * <p>Each rule encapsulates one discrete criterion from the scoring specification.
 * The engine collects all rules and sums their individual contributions to produce
 * the total eligibility score.</p>
 *
 * <p>Rules are designed to be stateless and thread-safe. All mutable configuration
 * is injected at construction time via {@link com.gov.subsidy.config.EligibilityScoringConfig}.</p>
 */
public interface EligibilityRule {

    /**
     * Returns a short, human-readable name for this rule.
     * Used in the score breakdown returned to the caller.
     *
     * @return the rule name (e.g. {@code "Income Criterion"})
     */
    String getRuleName();

    /**
     * Returns a human-readable description explaining what this rule checks.
     *
     * @return the rule description
     */
    String getDescription();

    /**
     * Evaluates the rule against the given beneficiary and returns the score contribution.
     *
     * @param beneficiary the beneficiary profile to evaluate
     * @return the number of points awarded (0 if the criterion is not met)
     */
    int evaluate(Beneficiary beneficiary);
}
