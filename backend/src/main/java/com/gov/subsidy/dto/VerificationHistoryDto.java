package com.gov.subsidy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO representing a single entry in a verification's audit trail.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VerificationHistoryDto {

    private Long id;

    /** ID of the parent verification record. */
    private Long verificationId;

    /** The officer who performed this action. */
    private UserDto officer;

    /** Status recorded at the moment of this action. */
    private String status;

    /** Remarks provided by the officer at the time of action. */
    private String remarks;

    /** Timestamp when the action was performed. */
    private LocalDateTime actionDate;

    /** Audit metadata. */
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}
