package com.gov.subsidy.eligibility.rules;

import com.gov.subsidy.config.EligibilityScoringConfig;
import com.gov.subsidy.eligibility.EligibilityRule;
import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.enums.VerificationStatus;
import org.springframework.stereotype.Component;

/**
 * Rule: All required documents are complete and verified.
 *
 * <p>A beneficiary is considered to have complete documents when their
 * {@code eligibilityStatus} is {@link VerificationStatus#VERIFIED}, meaning
 * a field officer has reviewed and approved all submitted documents.</p>
 *
 * <p>Configured by: {@code eligibility.scoring.documents-score}</p>
 */
@Component
public class DocumentsCompleteRule implements EligibilityRule {

    private final EligibilityScoringConfig config;

    public DocumentsCompleteRule(EligibilityScoringConfig config) {
        this.config = config;
    }

    @Override
    public String getRuleName() {
        return "Documents Complete Criterion";
    }

    @Override
    public String getDescription() {
        return "All documents verified (eligibilityStatus = VERIFIED) earns +" +
               config.getDocumentsScore() + " points";
    }

    @Override
    public int evaluate(Beneficiary beneficiary) {
        if (beneficiary.getEligibilityStatus() == null) {
            return 0;
        }
        return beneficiary.getEligibilityStatus() == VerificationStatus.VERIFIED
                ? config.getDocumentsScore()
                : 0;
    }
}
