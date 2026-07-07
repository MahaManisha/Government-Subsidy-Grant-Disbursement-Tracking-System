package com.gov.subsidy.repository;

import com.gov.subsidy.entity.Beneficiary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BeneficiaryRepository extends JpaRepository<Beneficiary, Long> {

    Optional<Beneficiary> findByUniqueIdNumber(String uniqueIdNumber);

    Optional<Beneficiary> findByUserUsername(String username);

    boolean existsByUniqueIdNumber(String uniqueIdNumber);
}
