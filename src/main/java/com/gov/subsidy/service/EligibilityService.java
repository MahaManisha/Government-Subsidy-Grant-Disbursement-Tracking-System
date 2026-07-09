package com.gov.subsidy.service;

import com.gov.subsidy.dto.EligibilityScoringResponseDto;

/**
 * Service interface defining the contract for the Eligibility Scoring Engine.
 *
 * <p>The engine computes a numeric eligibility score for a submitted application by
 * evaluating a configurable set of business rules against the linked beneficiary's profile.
 * The final score determines whether the application is marked ELIGIBLE or REJECTED.</p>
 *
 * <p>Scoring rules and thresholds are externally configurable via
 * {@code application.properties} under the {@code eligibility.scoring.*} prefix.</p>
 */
public interface EligibilityService {

    /**
     * Runs the eligibility scoring engine for the given application.
     *
     * <p>Steps performed:
     * <ol>
     *   <li>Load the application (throws {@link com.gov.subsidy.exception.ResourceNotFoundException}
     *       if not found).</li>
     *   <li>Evaluate each configured rule against the linked beneficiary.</li>
     *   <li>Sum individual rule scores into a total score.</li>
     *   <li>Determine result: {@code ELIGIBLE} if total ≥ configured threshold (default 80),
     *       {@code REJECTED} otherwise.</li>
     *   <li>Persist the score and result on the {@link com.gov.subsidy.entity.Application} entity.</li>
     *   <li>Return a detailed {@link EligibilityScoringResponseDto} including the per-rule breakdown.</li>
     * </ol>
     * </p>
     *
     * @param applicationId the primary key of the application to score
     * @return detailed scoring response including total score, eligibility result, and rule breakdown
     * @throws com.gov.subsidy.exception.ResourceNotFoundException if no application exists with the given ID
     */
    EligibilityScoringResponseDto scoreApplication(Long applicationId);
}
