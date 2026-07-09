package com.gov.subsidy.eligibility.rules;

import com.gov.subsidy.config.EligibilityScoringConfig;
import com.gov.subsidy.eligibility.EligibilityRule;
import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.enums.Gender;
import org.springframework.stereotype.Component;

/**
 * Rule: Beneficiary is a woman (Gender = FEMALE).
 *
 * <p>Configured by: {@code eligibility.scoring.women-score}</p>
 */
@Component
public class GenderCriteriaRule implements EligibilityRule {

    private final EligibilityScoringConfig config;

    public GenderCriteriaRule(EligibilityScoringConfig config) {
        this.config = config;
    }

    @Override
    public String getRuleName() {
        return "Women Criterion";
    }

    @Override
    public String getDescription() {
        return "Female gender earns +" + config.getWomenScore() + " points";
    }

    @Override
    public int evaluate(Beneficiary beneficiary) {
        if (beneficiary.getGender() == null) {
            return 0;
        }
        return beneficiary.getGender() == Gender.FEMALE
                ? config.getWomenScore()
                : 0;
    }
}
