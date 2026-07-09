package com.gov.subsidy.repository;

import com.gov.subsidy.entity.Beneficiary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BeneficiaryRepository extends JpaRepository<Beneficiary, Long> {

    /**
     * Find a beneficiary by their unique identification number (Aadhaar / UID).
     */
    Optional<Beneficiary> findByUniqueIdNumber(String uniqueIdNumber);

    /**
     * Find a beneficiary by the username of the linked User account.
     */
    Optional<Beneficiary> findByUserUsername(String username);

    /**
     * Find a beneficiary by their registered phone number.
     */
    Optional<Beneficiary> findByPhoneNumber(String phoneNumber);

    /**
     * Find a beneficiary by their bank account number.
     */
    Optional<Beneficiary> findByBankAccountNumber(String bankAccountNumber);

    /**
     * Find a beneficiary by the ID of the linked User account.
     */
    Optional<Beneficiary> findByUserId(Long userId);

    /**
     * Check whether a beneficiary with the given Aadhaar / UID already exists.
     */
    boolean existsByUniqueIdNumber(String uniqueIdNumber);

    /**
     * Check whether a beneficiary with the given phone number already exists.
     */
    boolean existsByPhoneNumber(String phoneNumber);

    /**
     * Check whether a beneficiary with the given bank account number already exists.
     */
    boolean existsByBankAccountNumber(String bankAccountNumber);

    /**
     * Check uniqueness excluding the beneficiary currently being updated.
     * Used during update to allow a beneficiary to keep their own phone number.
     */
    boolean existsByPhoneNumberAndIdNot(String phoneNumber, Long id);

    /**
     * Check uniqueness excluding the beneficiary currently being updated.
     * Used during update to allow a beneficiary to keep their own bank account.
     */
    boolean existsByBankAccountNumberAndIdNot(String bankAccountNumber, Long id);

    /**
     * Check whether a linked user account is already assigned to another beneficiary profile.
     */
    boolean existsByUserId(Long userId);
}
