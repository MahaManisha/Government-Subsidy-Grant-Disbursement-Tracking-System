package com.gov.subsidy.service.impl;

import com.gov.subsidy.config.EligibilityScoringConfig;
import com.gov.subsidy.dto.EligibilityScoringResponseDto;
import com.gov.subsidy.eligibility.EligibilityRule;
import com.gov.subsidy.eligibility.RuleResult;
import com.gov.subsidy.entity.Application;
import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.enums.EligibilityResult;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.service.EligibilityService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implementation of {@link EligibilityService} — the Eligibility Scoring Engine.
 *
 * <p>Responsibilities:
 * <ul>
 *   <li>Orchestrating all registered {@link EligibilityRule} implementations
 *       (injected by Spring as a {@code List<EligibilityRule>})</li>
 *   <li>Summing rule contributions into a total eligibility score</li>
 *   <li>Applying the configured threshold to determine ELIGIBLE or REJECTED</li>
 *   <li>Persisting the score and result back to the {@link Application} entity</li>
 *   <li>Returning a detailed breakdown so callers understand every rule's contribution</li>
 * </ul>
 * </p>
 *
 * <p>Adding a new rule requires only implementing {@link EligibilityRule} and
 * annotating the class with {@code @Component}. Spring auto-discovers it and
 * injects it into the list — no changes to this class needed.</p>
 */
@Service
@Transactional
public class EligibilityServiceImpl implements EligibilityService {

    private final ApplicationRepository applicationRepository;
    private final List<EligibilityRule> rules;
    private final EligibilityScoringConfig config;

    /**
     * Spring injects all {@link EligibilityRule} beans automatically via the List parameter.
     * This is the Open/Closed Principle in action — new rules are added without modifying
     * the engine.
     */
    public EligibilityServiceImpl(ApplicationRepository applicationRepository,
                                   List<EligibilityRule> rules,
                                   EligibilityScoringConfig config) {
        this.applicationRepository = applicationRepository;
        this.rules = rules;
        this.config = config;
    }

    // =========================================================================
    // SCORE APPLICATION
    // =========================================================================

    @Override
    public EligibilityScoringResponseDto scoreApplication(Long applicationId) {

        // --- 1. Load application ---
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Application not found with ID: " + applicationId));

        Beneficiary beneficiary = application.getBeneficiary();

        // --- 2. Evaluate every rule and collect individual results ---
        List<RuleResult> ruleResults = new ArrayList<>();
        int totalScore = 0;

        for (EligibilityRule rule : rules) {
            int score = rule.evaluate(beneficiary);
            boolean passed = score > 0;
            ruleResults.add(new RuleResult(rule.getRuleName(), rule.getDescription(), score, passed));
            totalScore += score;
        }

        // --- 3. Determine eligibility result ---
        EligibilityResult result = totalScore >= config.getEligibleThreshold()
                ? EligibilityResult.ELIGIBLE
                : EligibilityResult.REJECTED;

        // --- 4. Persist score and result on the application entity ---
        application.setEligibilityScore(totalScore);
        application.setEligibilityResult(result);
        application.setLastModifiedDate(LocalDateTime.now());
        applicationRepository.save(application);

        // --- 5. Build and return detailed response ---
        List<EligibilityScoringResponseDto.RuleBreakdownDto> breakdown = ruleResults.stream()
                .map(r -> EligibilityScoringResponseDto.RuleBreakdownDto.builder()
                        .ruleName(r.getRuleName())
                        .description(r.getDescription())
                        .scoreAwarded(r.getScoreAwarded())
                        .passed(r.isPassed())
                        .build())
                .collect(Collectors.toList());

        return EligibilityScoringResponseDto.builder()
                .applicationId(application.getId())
                .applicationNumber(application.getApplicationNumber())
                .totalScore(totalScore)
                .eligibilityResult(result.name())
                .eligibleThreshold(config.getEligibleThreshold())
                .ruleBreakdown(breakdown)
                .build();
    }
}
