package com.gov.subsidy.service;

import com.gov.subsidy.dto.AssignOfficerRequestDto;
import com.gov.subsidy.dto.VerificationActionRequestDto;
import com.gov.subsidy.dto.VerificationDto;
import com.gov.subsidy.dto.VerificationHistoryDto;

import java.util.List;

/**
 * Service interface defining all operations for the Verification Workflow.
 *
 * <p>The complete workflow follows this stage progression:
 * <pre>
 *   SUBMITTED
 *     ↓ assignFieldOfficer()
 *   UNDER_REVIEW / FIELD_VERIFICATION stage
 *     ↓ performFieldVerification(APPROVE)
 *   DISTRICT_REVIEW stage
 *     ↓ performDistrictReview(APPROVE)
 *   FINANCE_REVIEW stage
 *     ↓ performFinanceReview(APPROVE)
 *   APPROVED
 * </pre>
 *
 * <p>At any stage, an officer can REJECT (→ REJECTED) or REQUEST_REVERIFICATION
 * (→ RE_VERIFICATION_REQUESTED, stage stays or resets to FIELD_VERIFICATION).</p>
 */
public interface VerificationService {

    /**
     * Step 1 — Assign Field Officer.
     *
     * <p>Creates the {@link com.gov.subsidy.entity.Verification} record and
     * transitions the application from SUBMITTED to UNDER_REVIEW at FIELD_VERIFICATION stage.</p>
     *
     * @param applicationId the application to begin verifying
     * @param request       officer assignment details
     * @return the created Verification record (with initial history entry)
     */
    VerificationDto assignFieldOfficer(Long applicationId, AssignOfficerRequestDto request);

    /**
     * Step 2 — Field Officer Verification.
     *
     * <p>Allowed actions: APPROVE (→ DISTRICT_REVIEW), REJECT (→ REJECTED),
     * REQUEST_REVERIFICATION (remains at FIELD_VERIFICATION with re-verify flag).</p>
     *
     * @param applicationId the application under field verification
     * @param request       action, officer, and optional remarks
     * @return updated Verification state with appended history
     */
    VerificationDto performFieldVerification(Long applicationId, VerificationActionRequestDto request);

    /**
     * Step 3 — District Officer Review.
     *
     * <p>Allowed actions: APPROVE (→ FINANCE_REVIEW), REJECT (→ REJECTED),
     * REQUEST_REVERIFICATION (→ resets to FIELD_VERIFICATION).</p>
     *
     * @param applicationId the application under district review
     * @param request       action, officer, and optional remarks
     * @return updated Verification state with appended history
     */
    VerificationDto performDistrictReview(Long applicationId, VerificationActionRequestDto request);

    /**
     * Step 4 — Finance Officer Review.
     *
     * <p>Allowed actions: APPROVE (application status → APPROVED, stage → FINANCE_REVIEW),
     * REJECT (→ REJECTED), REQUEST_REVERIFICATION (→ FIELD_VERIFICATION).</p>
     *
     * @param applicationId the application under finance review
     * @param request       action, officer, and optional remarks
     * @return updated Verification state with appended history
     */
    VerificationDto performFinanceReview(Long applicationId, VerificationActionRequestDto request);

    /**
     * Retrieve the current Verification record for an application,
     * including its full audit history.
     *
     * @param applicationId the application ID
     * @return the Verification DTO with embedded history
     */
    VerificationDto getVerificationByApplicationId(Long applicationId);

    /**
     * Retrieve the full audit trail (all history records) for an application's verification.
     *
     * @param applicationId the application ID
     * @return ordered list of history entries (oldest first)
     */
    List<VerificationHistoryDto> getVerificationHistory(Long applicationId);
}
