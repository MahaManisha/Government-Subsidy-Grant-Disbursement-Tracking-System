package com.gov.subsidy.service;

import com.gov.subsidy.dto.BeneficiaryCreateDto;
import com.gov.subsidy.dto.BeneficiaryDto;
import com.gov.subsidy.dto.BeneficiaryUpdateDto;

import java.util.List;

/**
 * Service interface defining the business operations for Beneficiary Management.
 *
 * <p>All validation, uniqueness checks, and entity mapping are encapsulated here,
 * keeping the controller thin and focused purely on HTTP concerns.</p>
 */
public interface BeneficiaryService {

    /**
     * Creates a new beneficiary profile.
     *
     * <p>Validates that:
     * <ul>
     *   <li>The Aadhaar number ({@code uniqueIdNumber}) is unique.</li>
     *   <li>The phone number is unique.</li>
     *   <li>The bank account number is unique.</li>
     *   <li>The IFSC code matches the standard format.</li>
     *   <li>The annual income is non-negative.</li>
     *   <li>If a {@code userId} is provided, the user exists and is not already
     *       linked to another beneficiary profile.</li>
     * </ul>
     * </p>
     *
     * @param createDto the request payload containing beneficiary details
     * @return the newly created beneficiary represented as a {@link BeneficiaryDto}
     */
    BeneficiaryDto createBeneficiary(BeneficiaryCreateDto createDto);

    /**
     * Retrieves all beneficiary profiles.
     *
     * @return an unordered list of all beneficiaries
     */
    List<BeneficiaryDto> getAllBeneficiaries();

    /**
     * Retrieves a single beneficiary profile by its primary key.
     *
     * @param id the unique ID of the beneficiary
     * @return the beneficiary represented as a {@link BeneficiaryDto}
     * @throws com.gov.subsidy.exception.ResourceNotFoundException if no beneficiary exists with the given ID
     */
    BeneficiaryDto getBeneficiaryById(Long id);

    /**
     * Updates an existing beneficiary profile.
     *
     * <p>The Aadhaar number ({@code uniqueIdNumber}) is immutable and cannot be
     * changed through this operation. The update validates that:
     * <ul>
     *   <li>The phone number is unique (excluding the current beneficiary).</li>
     *   <li>The bank account number is unique (excluding the current beneficiary).</li>
     *   <li>The IFSC code matches the standard format.</li>
     *   <li>The annual income is non-negative.</li>
     * </ul>
     * </p>
     *
     * @param id        the ID of the beneficiary to update
     * @param updateDto the request payload containing updated beneficiary details
     * @return the updated beneficiary represented as a {@link BeneficiaryDto}
     * @throws com.gov.subsidy.exception.ResourceNotFoundException if no beneficiary exists with the given ID
     */
    BeneficiaryDto updateBeneficiary(Long id, BeneficiaryUpdateDto updateDto);

    /**
     * Permanently deletes a beneficiary profile.
     *
     * @param id the ID of the beneficiary to delete
     * @throws com.gov.subsidy.exception.ResourceNotFoundException if no beneficiary exists with the given ID
     */
    void deleteBeneficiary(Long id);

    /**
     * Retrieves a beneficiary profile by the linked user's username.
     *
     * @param username the username of the linked user account
     * @return the beneficiary represented as a {@link BeneficiaryDto}
     * @throws com.gov.subsidy.exception.ResourceNotFoundException if no beneficiary exists for the username
     */
    BeneficiaryDto getBeneficiaryByUsername(String username);

    BeneficiaryDto approveBeneficiary(Long id, String remarks, String adminUsername);

    BeneficiaryDto rejectBeneficiary(Long id, String reason, String adminUsername);

    BeneficiaryDto requestChanges(Long id, String remarks, String adminUsername);

    BeneficiaryDto resubmitBeneficiary(Long id);
}
