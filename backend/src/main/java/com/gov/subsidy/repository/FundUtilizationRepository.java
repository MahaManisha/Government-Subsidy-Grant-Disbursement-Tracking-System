package com.gov.subsidy.repository;

import com.gov.subsidy.entity.FundUtilization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FundUtilizationRepository extends JpaRepository<FundUtilization, Long> {
    List<FundUtilization> findByApplicationId(Long applicationId);
    List<FundUtilization> findByBeneficiaryId(Long beneficiaryId);
    List<FundUtilization> findByDisbursementId(Long disbursementId);

    @org.springframework.data.jpa.repository.Query("SELECT b.district, SUM(fu.amountUtilized) FROM FundUtilization fu JOIN fu.beneficiary b WHERE fu.status = com.gov.subsidy.enums.VerificationStatus.VERIFIED GROUP BY b.district ORDER BY SUM(fu.amountUtilized) DESC")
    List<Object[]> findHighestFundUtilizationDistrict();
}
