package com.gov.subsidy.eligibility.rules;

import com.gov.subsidy.config.EligibilityScoringConfig;
import com.gov.subsidy.eligibility.EligibilityRule;
import com.gov.subsidy.entity.Beneficiary;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.Period;

/**
 * Rule: Beneficiary is a Senior Citizen (age ≥ configured threshold, default 60 years).
 *
 * <p>Age is derived from {@link Beneficiary#getDateOfBirth()} relative to today's date.
 * If {@code dateOfBirth} is {@code null}, the rule awards 0 points (benefit of the doubt
 * is NOT extended when no date of birth is on file).</p>
 *
 * <p>Configured by: {@code eligibility.scoring.senior-citizen-age} and
 * {@code eligibility.scoring.senior-citizen-score}</p>
 */
@Component
public class SeniorCitizenRule implements EligibilityRule {

    private final EligibilityScoringConfig config;

    public SeniorCitizenRule(EligibilityScoringConfig config) {
        this.config = config;
    }

    @Override
    public String getRuleName() {
        return "Senior Citizen Criterion";
    }

    @Override
    public String getDescription() {
        return "Age >= " + config.getSeniorCitizenAge() +
               " years earns +" + config.getSeniorCitizenScore() + " points";
    }

    @Override
    public int evaluate(Beneficiary beneficiary) {
        if (beneficiary.getDateOfBirth() == null) {
            return 0;
        }
        int age = Period.between(beneficiary.getDateOfBirth(), LocalDate.now()).getYears();
        return age >= config.getSeniorCitizenAge()
                ? config.getSeniorCitizenScore()
                : 0;
    }
}
