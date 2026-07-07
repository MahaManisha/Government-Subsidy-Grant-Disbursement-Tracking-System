package com.gov.subsidy.repository;

import com.gov.subsidy.entity.Scheme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SchemeRepository extends JpaRepository<Scheme, Long> {

    Optional<Scheme> findByCode(String code);

    boolean existsByCode(String code);

    boolean existsByName(String name);
}
