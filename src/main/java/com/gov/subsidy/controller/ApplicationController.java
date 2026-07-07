package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/applications")
public class ApplicationController {

    @PostMapping
    public ResponseEntity<BaseResponse<ApplicationDto>> createApplication(@Valid @RequestBody ApplicationCreateDto createDto) {
        ApplicationDto mockApplication = ApplicationDto.builder()
                .id(1L)
                .beneficiary(BeneficiaryDto.builder()
                        .id(createDto.getBeneficiaryId())
                        .uniqueIdNumber("123456789012")
                        .phoneNumber("9876543210")
                        .address("123, Green Valley, New Delhi")
                        .bankAccountNumber("918273645281")
                        .bankIfscCode("SBIN0000123")
                        .annualIncome(new BigDecimal("150000.00"))
                        .eligibilityStatus("VERIFIED")
                        .gender("MALE")
                        .category("OBC")
                        .build())
                .scheme(SchemeDto.builder()
                        .id(createDto.getSchemeId())
                        .name("Pradhan Mantri Fasal Bima Yojana")
                        .code("PMFBY-2026")
                        .description("Crop insurance scheme for farmers to provide financial support.")
                        .budgetAllocation(new BigDecimal("50000000.00"))
                        .remainingBudget(new BigDecimal("42000000.00"))
                        .startDate(LocalDate.of(2026, 6, 1))
                        .endDate(LocalDate.of(2027, 6, 1))
                        .active(true)
                        .status("ACTIVE")
                        .build())
                .applicationNumber("APP-2026-0001")
                .requestedAmount(createDto.getRequestedAmount())
                .approvedAmount(null)
                .workflowStatus("SUBMITTED")
                .currentStage("INITIATION")
                .eligibilityScore(75)
                .assignedOfficer(UserDto.builder()
                        .id(50L)
                        .username("field_officer_1")
                        .email("officer1@gov.in")
                        .firstName("Raj")
                        .lastName("Sharma")
                        .active(true)
                        .roles(Collections.singleton("ROLE_FIELD_OFFICER"))
                        .build())
                .submittedDate(LocalDateTime.now())
                .verifiedDate(null)
                .approvedDate(null)
                .lastModifiedDate(LocalDateTime.now())
                .remarks("Initial submission")
                .priority(createDto.getPriority())
                .isFlagged(false)
                .reVerificationRequested(false)
                .rejectionReason(null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(BaseResponse.success(mockApplication, "Subsidy application submitted successfully"));
    }

    @GetMapping
    public ResponseEntity<BaseResponse<List<ApplicationDto>>> getAllApplications() {
        ApplicationDto mockApplication1 = ApplicationDto.builder()
                .id(1L)
                .beneficiary(BeneficiaryDto.builder()
                        .id(1L)
                        .uniqueIdNumber("123456789012")
                        .phoneNumber("9876543210")
                        .build())
                .scheme(SchemeDto.builder()
                        .id(1L)
                        .name("Pradhan Mantri Fasal Bima Yojana")
                        .code("PMFBY-2026")
                        .build())
                .applicationNumber("APP-2026-0001")
                .requestedAmount(new BigDecimal("25000.00"))
                .approvedAmount(new BigDecimal("25000.00"))
                .workflowStatus("DISBURSED")
                .currentStage("COMPLETED")
                .eligibilityScore(90)
                .assignedOfficer(UserDto.builder().id(50L).username("field_officer_1").build())
                .submittedDate(LocalDateTime.now().minusDays(10))
                .verifiedDate(LocalDateTime.now().minusDays(8))
                .approvedDate(LocalDateTime.now().minusDays(7))
                .lastModifiedDate(LocalDateTime.now().minusDays(5))
                .remarks("Funds successfully transferred to beneficiary account")
                .priority("HIGH")
                .isFlagged(false)
                .reVerificationRequested(false)
                .rejectionReason(null)
                .createdAt(LocalDateTime.now().minusDays(10))
                .updatedAt(LocalDateTime.now().minusDays(5))
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        ApplicationDto mockApplication2 = ApplicationDto.builder()
                .id(2L)
                .beneficiary(BeneficiaryDto.builder()
                        .id(2L)
                        .uniqueIdNumber("987654321098")
                        .phoneNumber("8765432109")
                        .build())
                .scheme(SchemeDto.builder()
                        .id(2L)
                        .name("National Fellowship for Higher Education")
                        .code("NFHE-2026")
                        .build())
                .applicationNumber("APP-2026-0002")
                .requestedAmount(new BigDecimal("120000.00"))
                .approvedAmount(null)
                .workflowStatus("UNDER_REVIEW")
                .currentStage("FIELD_VERIFICATION")
                .eligibilityScore(82)
                .assignedOfficer(UserDto.builder().id(51L).username("field_officer_2").build())
                .submittedDate(LocalDateTime.now().minusDays(2))
                .verifiedDate(null)
                .approvedDate(null)
                .lastModifiedDate(LocalDateTime.now())
                .remarks("Income certificates pending verification")
                .priority("MEDIUM")
                .isFlagged(false)
                .reVerificationRequested(false)
                .rejectionReason(null)
                .createdAt(LocalDateTime.now().minusDays(2))
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        List<ApplicationDto> mockApplications = Arrays.asList(mockApplication1, mockApplication2);
        return ResponseEntity.ok(BaseResponse.success(mockApplications, "Applications audited successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<ApplicationDto>> getApplicationById(@PathVariable Long id) {
        ApplicationDto mockApplication = ApplicationDto.builder()
                .id(id)
                .beneficiary(BeneficiaryDto.builder()
                        .id(10L)
                        .uniqueIdNumber("111122223333")
                        .phoneNumber("9000000000")
                        .build())
                .scheme(SchemeDto.builder()
                        .id(20L)
                        .name("Mock Grant Scheme")
                        .code("MOCK-SCHEME")
                        .build())
                .applicationNumber("APP-2026-000" + id)
                .requestedAmount(new BigDecimal("50000.00"))
                .approvedAmount(null)
                .workflowStatus("UNDER_REVIEW")
                .currentStage("FIELD_VERIFICATION")
                .eligibilityScore(65)
                .assignedOfficer(UserDto.builder().id(50L).username("field_officer_1").build())
                .submittedDate(LocalDateTime.now().minusDays(3))
                .verifiedDate(null)
                .approvedDate(null)
                .lastModifiedDate(LocalDateTime.now())
                .remarks("Awaiting official signature")
                .priority("LOW")
                .isFlagged(false)
                .reVerificationRequested(false)
                .rejectionReason(null)
                .createdAt(LocalDateTime.now().minusDays(3))
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        return ResponseEntity.ok(BaseResponse.success(mockApplication, "Application logs fetched successfully"));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<BaseResponse<ApplicationDto>> updateApplicationStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(required = false) String remarks) {

        String parsedStatus = status.toUpperCase();
        ApplicationDto mockApplication = ApplicationDto.builder()
                .id(id)
                .beneficiary(BeneficiaryDto.builder()
                        .id(10L)
                        .uniqueIdNumber("111122223333")
                        .build())
                .scheme(SchemeDto.builder()
                        .id(20L)
                        .name("Mock Grant Scheme")
                        .code("MOCK-SCHEME")
                        .build())
                .applicationNumber("APP-2026-000" + id)
                .requestedAmount(new BigDecimal("50000.00"))
                .approvedAmount(parsedStatus.equals("APPROVED") ? new BigDecimal("50000.00") : BigDecimal.ZERO)
                .workflowStatus(parsedStatus)
                .currentStage(parsedStatus.equals("APPROVED") ? "FINANCIAL_DISBURSEMENT" : "COMPLETED")
                .eligibilityScore(88)
                .assignedOfficer(UserDto.builder().id(50L).username("field_officer_1").build())
                .submittedDate(LocalDateTime.now().minusDays(3))
                .verifiedDate(LocalDateTime.now().minusDays(1))
                .approvedDate(parsedStatus.equals("APPROVED") ? LocalDateTime.now() : null)
                .lastModifiedDate(LocalDateTime.now())
                .remarks(remarks != null ? remarks : "Status updated by officer")
                .priority("HIGH")
                .isFlagged(false)
                .reVerificationRequested(false)
                .rejectionReason(parsedStatus.equals("REJECTED") ? "Failed field audit" : null)
                .createdAt(LocalDateTime.now().minusDays(3))
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        return ResponseEntity.ok(BaseResponse.success(mockApplication, "Application status successfully updated to " + status));
    }
}
