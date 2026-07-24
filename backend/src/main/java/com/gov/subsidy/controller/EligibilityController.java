package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.BaseResponse;
import com.gov.subsidy.dto.EligibilityScoringResponseDto;
import com.gov.subsidy.service.EligibilityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * REST controller exposing the Eligibility Scoring Engine endpoint.
 *
 * <p>Base URL: {@code /v1/applications/{id}/score}</p>
 *
 * <p>This controller is intentionally kept thin — all scoring logic lives in
 * {@link EligibilityService} and its rule implementations.</p>
 */
@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/applications")
@Tag(
        name = "Eligibility Scoring",
        description = "Engine that scores an application's linked beneficiary against configurable " +
                "business rules and stores the result. Scoring rules: " +
                "Income < ₹2L (+40), SC/ST (+20), Women (+10), Senior Citizen (+10), " +
                "Documents Verified (+20). Threshold: score >= 80 → ELIGIBLE."
)
public class EligibilityController {

    private final EligibilityService eligibilityService;

    public EligibilityController(EligibilityService eligibilityService) {
        this.eligibilityService = eligibilityService;
    }

    // =========================================================================
    // POST /v1/applications/{id}/score — Run Eligibility Scoring
    // =========================================================================

    @PostMapping("/{id}/score")
    @Operation(
            summary = "Run eligibility scoring for an application",
            description = """
                    Executes the Eligibility Scoring Engine for the specified application.

                    **Scoring Rules (configurable via `application.properties`):**
                    | Rule                  | Criterion                              | Points |
                    |-----------------------|----------------------------------------|--------|
                    | Income Criterion      | Annual income < ₹2,00,000 (2 Lakhs)   | +40    |
                    | SC/ST Category        | Category is SC or ST                   | +20    |
                    | Women Criterion       | Gender is FEMALE                       | +10    |
                    | Senior Citizen        | Date of birth → age >= 60 years        | +10    |
                    | Documents Complete    | Beneficiary eligibilityStatus=VERIFIED | +20    |

                    **Maximum possible score: 100**

                    **Eligibility Threshold (configurable):** Score >= 80 → `ELIGIBLE`, otherwise `REJECTED`

                    **Side effects:**
                    - `eligibilityScore` is persisted on the Application record
                    - `eligibilityResult` is persisted on the Application record (ELIGIBLE or REJECTED)
                    - `lastModifiedDate` is updated

                    Scoring can be re-run at any time — repeated calls overwrite the previous score.
                    """
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Scoring completed successfully",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class),
                            examples = {
                                    @ExampleObject(
                                            name = "ELIGIBLE – Score 90",
                                            summary = "Female, SC, income < 2L, documents verified",
                                            value = """
                                                    {
                                                      "success": true,
                                                      "message": "Eligibility scoring completed successfully",
                                                      "data": {
                                                        "applicationId": 1,
                                                        "applicationNumber": "APP-2026-000001",
                                                        "totalScore": 90,
                                                        "eligibilityResult": "ELIGIBLE",
                                                        "eligibleThreshold": 80,
                                                        "ruleBreakdown": [
                                                          {
                                                            "ruleName": "Income Criterion",
                                                            "description": "Annual income below ₹200000 earns +40 points",
                                                            "scoreAwarded": 40,
                                                            "passed": true
                                                          },
                                                          {
                                                            "ruleName": "SC/ST Category Criterion",
                                                            "description": "SC or ST social category earns +20 points",
                                                            "scoreAwarded": 20,
                                                            "passed": true
                                                          },
                                                          {
                                                            "ruleName": "Women Criterion",
                                                            "description": "Female gender earns +10 points",
                                                            "scoreAwarded": 10,
                                                            "passed": true
                                                          },
                                                          {
                                                            "ruleName": "Senior Citizen Criterion",
                                                            "description": "Age >= 60 years earns +10 points",
                                                            "scoreAwarded": 0,
                                                            "passed": false
                                                          },
                                                          {
                                                            "ruleName": "Documents Complete Criterion",
                                                            "description": "All documents verified (eligibilityStatus = VERIFIED) earns +20 points",
                                                            "scoreAwarded": 20,
                                                            "passed": true
                                                          }
                                                        ]
                                                      },
                                                      "timestamp": "2026-07-09T18:56:45"
                                                    }
                                                    """
                                    ),
                                    @ExampleObject(
                                            name = "REJECTED – Score 50",
                                            summary = "Male, GENERAL, income > 2L, unverified",
                                            value = """
                                                    {
                                                      "success": true,
                                                      "message": "Eligibility scoring completed successfully",
                                                      "data": {
                                                        "applicationId": 2,
                                                        "applicationNumber": "APP-2026-000002",
                                                        "totalScore": 50,
                                                        "eligibilityResult": "REJECTED",
                                                        "eligibleThreshold": 80,
                                                        "ruleBreakdown": [
                                                          {
                                                            "ruleName": "Income Criterion",
                                                            "description": "Annual income below ₹200000 earns +40 points",
                                                            "scoreAwarded": 40,
                                                            "passed": true
                                                          },
                                                          {
                                                            "ruleName": "SC/ST Category Criterion",
                                                            "description": "SC or ST social category earns +20 points",
                                                            "scoreAwarded": 0,
                                                            "passed": false
                                                          },
                                                          {
                                                            "ruleName": "Women Criterion",
                                                            "description": "Female gender earns +10 points",
                                                            "scoreAwarded": 0,
                                                            "passed": false
                                                          },
                                                          {
                                                            "ruleName": "Senior Citizen Criterion",
                                                            "description": "Age >= 60 years earns +10 points",
                                                            "scoreAwarded": 10,
                                                            "passed": true
                                                          },
                                                          {
                                                            "ruleName": "Documents Complete Criterion",
                                                            "description": "All documents verified (eligibilityStatus = VERIFIED) earns +20 points",
                                                            "scoreAwarded": 0,
                                                            "passed": false
                                                          }
                                                        ]
                                                      },
                                                      "timestamp": "2026-07-09T18:56:45"
                                                    }
                                                    """
                                    )
                            }
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Application not found",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    name = "Not Found – 404",
                                    value = """
                                            {
                                              "success": false,
                                              "message": "Resource not found",
                                              "data": {
                                                "timestamp": "2026-07-09T18:56:45",
                                                "message": "Application not found with ID: 999",
                                                "details": "uri=/v1/applications/999/score"
                                              },
                                              "timestamp": "2026-07-09T18:56:45"
                                            }
                                            """
                            )
                    )
            )
    })
    @PreAuthorize("hasAnyRole('ADMIN', 'FIELD_OFFICER', 'DISTRICT_OFFICER', 'FINANCE_OFFICER')")
    public ResponseEntity<BaseResponse<EligibilityScoringResponseDto>> scoreApplication(
            @Parameter(description = "Primary key of the application to score", example = "1", required = true)
            @PathVariable Long id) {

        EligibilityScoringResponseDto result = eligibilityService.scoreApplication(id);
        return ResponseEntity.ok(
                BaseResponse.success(result, "Eligibility scoring completed successfully"));
    }
}
