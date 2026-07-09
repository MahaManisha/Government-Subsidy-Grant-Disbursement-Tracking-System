package com.gov.subsidy.repository;

import com.gov.subsidy.entity.Verification;
import com.gov.subsidy.enums.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VerificationRepository extends JpaRepository<Verification, Long> {

    /**
     * Find the verification record linked to a specific application.
     * There is at most one Verification per Application (OneToOne).
     */
    Optional<Verification> findByApplicationId(Long applicationId);

    /**
     * Check whether a verification record already exists for the given application.
     */
    boolean existsByApplicationId(Long applicationId);

    /**
     * Find all verification records assigned to a particular field officer.
     */
    List<Verification> findByFieldOfficerId(Long fieldOfficerId);

    /**
     * Find all verification records that are in the given status.
     */
    List<Verification> findByStatus(VerificationStatus status);
}
