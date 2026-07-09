package com.gov.subsidy.eligibility.rules;

import com.gov.subsidy.config.EligibilityScoringConfig;
import com.gov.subsidy.eligibility.EligibilityRule;
import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.enums.BeneficiaryCategory;
import org.springframework.stereotype.Component;

/**
 * Rule: Beneficiary belongs to SC (Scheduled Caste) or ST (Scheduled Tribe) category.
 *
 * <p>Configured by: {@code eligibility.scoring.sc-st-score}</p>
 */
@Component
public class CategoryCriteriaRule implements EligibilityRule {

    private final EligibilityScoringConfig config;

    public CategoryCriteriaRule(EligibilityScoringConfig config) {
        this.config = config;
    }

    @Override
    public String getRuleName() {
        return "SC/ST Category Criterion";
    }

    @Override
    public String getDescription() {
        return "SC or ST social category earns +" + config.getScStScore() + " points";
    }

    @Override
    public int evaluate(Beneficiary beneficiary) {
        if (beneficiary.getCategory() == null) {
            return 0;
        }
        return beneficiary.getCategory() == BeneficiaryCategory.SC
                || beneficiary.getCategory() == BeneficiaryCategory.ST
                ? config.getScStScore()
                : 0;
    }
}
