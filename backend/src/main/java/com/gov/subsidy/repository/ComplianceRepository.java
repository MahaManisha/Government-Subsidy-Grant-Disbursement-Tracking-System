package com.gov.subsidy.repository;

import com.gov.subsidy.entity.Compliance;
import com.gov.subsidy.enums.ComplianceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComplianceRepository extends JpaRepository<Compliance, Long> {
    List<Compliance> findByApplicationId(Long applicationId);
    List<Compliance> findByBeneficiaryId(Long beneficiaryId);
    boolean existsByBeneficiaryId(Long beneficiaryId);
    List<Compliance> findByDisbursementId(Long disbursementId);
    Optional<Compliance> findByApplicationIdAndMilestoneNumber(Long applicationId, Integer milestoneNumber);
    boolean existsByApplicationIdAndMilestoneNumberAndStatus(Long applicationId, Integer milestoneNumber, ComplianceStatus status);

    long countByStatus(ComplianceStatus status);
}
