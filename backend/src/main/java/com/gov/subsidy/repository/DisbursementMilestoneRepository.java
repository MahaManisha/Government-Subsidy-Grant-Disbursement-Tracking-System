package com.gov.subsidy.repository;

import com.gov.subsidy.entity.DisbursementMilestone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DisbursementMilestoneRepository extends JpaRepository<DisbursementMilestone, Long> {
    List<DisbursementMilestone> findByDisbursementPlanIdOrderByMilestoneNumberAsc(Long planId);

    @org.springframework.data.jpa.repository.Query("SELECT b.district, SUM(m.amount) FROM DisbursementMilestone m JOIN m.disbursementPlan p JOIN p.application a JOIN a.beneficiary b WHERE m.paymentStatus = com.gov.subsidy.enums.DisbursementStatus.SUCCESS GROUP BY b.district")
    List<Object[]> sumAmountReleasedByDistrict();

    @org.springframework.data.jpa.repository.Query("SELECT b.state, SUM(m.amount) FROM DisbursementMilestone m JOIN m.disbursementPlan p JOIN p.application a JOIN a.beneficiary b WHERE m.paymentStatus = com.gov.subsidy.enums.DisbursementStatus.SUCCESS GROUP BY b.state")
    List<Object[]> sumAmountReleasedByState();

    @org.springframework.data.jpa.repository.Query("SELECT SUM(m.amount) FROM DisbursementMilestone m WHERE m.paymentStatus = com.gov.subsidy.enums.DisbursementStatus.SUCCESS")
    java.math.BigDecimal sumTotalAmountReleased();
}
