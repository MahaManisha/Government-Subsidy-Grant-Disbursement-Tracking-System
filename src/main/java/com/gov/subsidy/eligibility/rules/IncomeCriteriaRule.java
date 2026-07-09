package com.gov.subsidy.eligibility.rules;

import com.gov.subsidy.config.EligibilityScoringConfig;
import com.gov.subsidy.eligibility.EligibilityRule;
import com.gov.subsidy.entity.Beneficiary;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Rule: Annual income below the configured threshold (default: 2 Lakhs = ₹2,00,000).
 *
 * <p>Configured by: {@code eligibility.scoring.income-threshold} and
 * {@code eligibility.scoring.income-score}</p>
 */
@Component
public class IncomeCriteriaRule implements EligibilityRule {

    private final EligibilityScoringConfig config;

    public IncomeCriteriaRule(EligibilityScoringConfig config) {
        this.config = config;
    }

    @Override
    public String getRuleName() {
        return "Income Criterion";
    }

    @Override
    public String getDescription() {
        return "Annual income below ₹" + config.getIncomeThreshold() +
               " earns +" + config.getIncomeScore() + " points";
    }

    @Override
    public int evaluate(Beneficiary beneficiary) {
        if (beneficiary.getAnnualIncome() == null) {
            return 0;
        }
        BigDecimal threshold = BigDecimal.valueOf(config.getIncomeThreshold());
        return beneficiary.getAnnualIncome().compareTo(threshold) < 0
                ? config.getIncomeScore()
                : 0;
    }
}
