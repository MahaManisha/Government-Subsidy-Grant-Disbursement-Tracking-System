package com.gov.subsidy.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Full response from the Approval Routing Engine containing:
 * <ul>
 *   <li>The routing decision that was made</li>
 *   <li>The officer assigned (if any)</li>
 *   <li>The machine-generated rationale</li>
 *   <li>The updated application state</li>
 *   <li>The complete routing history for this application</li>
 * </ul>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Result returned by the Approval Routing Engine")
public class RoutingResponseDto {

    @Schema(description = "The routing decision determined by the engine",
            example = "FAST_TRACK",
            allowableValues = {"FAST_TRACK","STANDARD","DISTRICT_REVIEW","FINANCE_REVIEW",
                               "FLAGGED","ESCALATED","REASSIGNED","REJECTED"})
    private String decision;

    @Schema(description = "Officer assigned to this application (null when FLAGGED or REJECTED)")
    private UserDto assignedOfficer;

    @Schema(description = "Machine-generated rationale explaining the routing decision",
            example = "Score 92 >= fast-track threshold 90. Amount 25000 < high threshold 500000. Decision: FAST_TRACK.")
    private String rationale;

    @Schema(description = "Application summary reflecting the updated state")
    private ApplicationDto application;

    @Schema(description = "All routing records for this application in chronological order")
    private List<RoutingRecordDto> routingHistory;
}
