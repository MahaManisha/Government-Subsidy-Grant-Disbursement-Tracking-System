package com.gov.subsidy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationDto {

    private Long id;
    private BeneficiaryDto beneficiary;
    private SchemeDto scheme;
    private String applicationNumber;
    private BigDecimal requestedAmount;
    private BigDecimal approvedAmount;
    private String workflowStatus;
    private String currentStage;
    private Integer eligibilityScore;
    private UserDto assignedOfficer;
    private LocalDateTime submittedDate;
    private LocalDateTime verifiedDate;
    private LocalDateTime approvedDate;
    private LocalDateTime lastModifiedDate;
    private String remarks;
    private String priority;
    private boolean isFlagged;
    private boolean reVerificationRequested;
    private String rejectionReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}
