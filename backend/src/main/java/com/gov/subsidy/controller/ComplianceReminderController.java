package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.BaseResponse;
import com.gov.subsidy.dto.ComplianceReminderDto;
import com.gov.subsidy.service.ComplianceReminderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.access.prepost.PostAuthorize;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/compliances/reminders")
@Tag(
        name = "Compliance Reminder Automation",
        description = "API endpoints to trigger manual verification scans and retrieve reminder history for compliance checks."
)
public class ComplianceReminderController {

    private final ComplianceReminderService reminderService;

    public ComplianceReminderController(ComplianceReminderService reminderService) {
        this.reminderService = reminderService;
    }

    @PostMapping("/trigger")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE_OFFICER')")
    @Operation(summary = "Trigger Reminder Scan", description = "Manually triggers the compliance due/overdue scan, transitioning breached deadlines to NON_COMPLIANT and logging reminder history.")
    public ResponseEntity<BaseResponse<Integer>> triggerScan() {
        int count = reminderService.runAutoVerificationAndReminders();
        return ResponseEntity.ok(BaseResponse.success(count, "Compliance scan executed. Reminders/Actions processed: " + count));
    }

    @GetMapping("/history/{complianceId}")
    @PostAuthorize("hasAnyRole('ADMIN', 'FINANCE_OFFICER') or (hasRole('BENEFICIARY') and principal != null && (returnObject.body.data == null || returnObject.body.data.isEmpty() || returnObject.body.data.get(0).recipientUsername == principal.username))")
    @Operation(summary = "Get Reminder History", description = "Retrieves the historical log of all SMS/Email/Dashboard reminders sent for a given compliance record.")
    public ResponseEntity<BaseResponse<List<ComplianceReminderDto>>> getReminderHistory(@PathVariable Long complianceId) {
        List<ComplianceReminderDto> history = reminderService.getReminderHistory(complianceId);
        return ResponseEntity.ok(BaseResponse.success(history));
    }
}
