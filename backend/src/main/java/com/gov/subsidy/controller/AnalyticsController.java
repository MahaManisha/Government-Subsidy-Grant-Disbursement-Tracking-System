package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.AnalyticsReportDto;
import com.gov.subsidy.dto.BaseResponse;
import com.gov.subsidy.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/analytics")
@Tag(
        name = "Regional Analytics & Reporting",
        description = "API endpoints for retrieving regional fund releases, scheme popularities, compliance ratios, and approval percentages."
)
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping({"/report", "/dashboard"})
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE_OFFICER')")
    @Operation(summary = "Get Regional Analytics Report", description = "Generates a dashboard-friendly summary of regional fund distributions (district/state), approval/rejection rates, compliance ratios, and popularity indices.")
    public ResponseEntity<BaseResponse<AnalyticsReportDto>> getRegionalAnalyticsReport() {
        AnalyticsReportDto report = analyticsService.getRegionalAnalytics();
        return ResponseEntity.ok(BaseResponse.success(report));
    }
}
