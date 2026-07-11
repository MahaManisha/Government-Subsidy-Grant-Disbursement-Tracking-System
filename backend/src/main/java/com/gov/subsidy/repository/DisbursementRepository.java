package com.gov.subsidy.repository;

import com.gov.subsidy.entity.Disbursement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DisbursementRepository extends JpaRepository<Disbursement, Long> {
    List<Disbursement> findByApplicationId(Long applicationId);
}
