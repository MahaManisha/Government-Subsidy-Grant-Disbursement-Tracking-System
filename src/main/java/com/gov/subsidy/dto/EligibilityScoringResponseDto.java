package com.gov.subsidy.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for the eligibility scoring engine.
 *
 * <p>Provides:
 * <ul>
 *   <li>The final computed score</li>
 *   <li>The eligibility decision (ELIGIBLE or REJECTED)</li>
 *   <li>A full per-rule breakdown so clients understand exactly how the score was derived</li>
 * </ul>
 * </p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Result of running the eligibility scoring engine against an application")
public class EligibilityScoringResponseDto {

    @Schema(description = "Primary key of the scored application", example = "1")
    private Long applicationId;

    @Schema(description = "Auto-generated application number", example = "APP-2026-000001")
    private String applicationNumber;

    @Schema(description = "Total computed eligibility score (sum of all rule contributions)", example = "70")
    private int totalScore;

    @Schema(
            description = "Final eligibility determination. ELIGIBLE if totalScore >= threshold (default 80), REJECTED otherwise.",
            example = "REJECTED",
            allowableValues = {"ELIGIBLE", "REJECTED", "PENDING"}
    )
    private String eligibilityResult;

    @Schema(description = "Minimum score required to be ELIGIBLE (from configuration)", example = "80")
    private int eligibleThreshold;

    @Schema(description = "Detailed per-rule breakdown showing each rule's name, description, and contribution")
    private List<RuleBreakdownDto> ruleBreakdown;

    /**
     * Inner DTO representing the evaluation outcome of a single eligibility rule.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @Schema(description = "Score contribution from a single eligibility rule")
    public static class RuleBreakdownDto {

        @Schema(description = "Short name identifying the rule", example = "Income Criterion")
        private String ruleName;

        @Schema(
                description = "Human-readable explanation of what the rule checks",
                example = "Annual income below ₹200000 earns +40 points"
        )
        private String description;

        @Schema(description = "Points awarded by this rule (0 if criterion was not met)", example = "40")
        private int scoreAwarded;

        @Schema(description = "Whether the beneficiary satisfied this rule's criterion", example = "true")
        private boolean passed;
    }
}
