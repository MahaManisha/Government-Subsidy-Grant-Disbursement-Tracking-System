package com.gov.subsidy.repository;

import com.gov.subsidy.entity.DisbursementPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DisbursementPlanRepository extends JpaRepository<DisbursementPlan, Long> {
    Optional<DisbursementPlan> findByApplicationId(Long applicationId);
    boolean existsByApplicationId(Long applicationId);
}
