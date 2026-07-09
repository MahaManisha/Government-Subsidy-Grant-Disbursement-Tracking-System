package com.gov.subsidy.repository;

import com.gov.subsidy.entity.Scheme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SchemeRepository extends JpaRepository<Scheme, Long> {

    /**
     * Find a scheme by its unique business code (e.g. "PMFBY-2026").
     */
    Optional<Scheme> findByCode(String code);

    /**
     * Find all schemes whose active flag matches the given value.
     */
    List<Scheme> findByActive(boolean active);

    /**
     * Check whether a scheme with the given code already exists.
     * Used for uniqueness validation on create.
     */
    boolean existsByCode(String code);

    /**
     * Check whether a scheme with the given name already exists.
     * Used for uniqueness validation on create.
     */
    boolean existsByName(String name);

    /**
     * Check whether a scheme with the given code already exists,
     * excluding the scheme currently being updated.
     */
    boolean existsByCodeAndIdNot(String code, Long id);

    /**
     * Check whether a scheme with the given name already exists,
     * excluding the scheme currently being updated.
     */
    boolean existsByNameAndIdNot(String name, Long id);
}
