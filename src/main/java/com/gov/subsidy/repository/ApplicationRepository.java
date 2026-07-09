package com.gov.subsidy.repository;

import com.gov.subsidy.entity.Application;
import com.gov.subsidy.enums.ApplicationStatus;
import com.gov.subsidy.enums.WorkflowStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {

    Optional<Application> findByApplicationNumber(String applicationNumber);

    boolean existsByApplicationNumber(String applicationNumber);

    List<Application> findByBeneficiaryId(Long beneficiaryId);

    List<Application> findBySchemeId(Long schemeId);

    List<Application> findByWorkflowStatus(ApplicationStatus workflowStatus);

    List<Application> findByCurrentStage(WorkflowStage currentStage);

    List<Application> findByAssignedOfficerId(Long assignedOfficerId);

    /**
     * Checks whether a beneficiary has already submitted an application for the given scheme.
     * Used to prevent duplicate applications.
     *
     * @param beneficiaryId the ID of the beneficiary
     * @param schemeId      the ID of the scheme
     * @return {@code true} if a duplicate application exists
     */
    boolean existsByBeneficiaryIdAndSchemeId(Long beneficiaryId, Long schemeId);

    /**
     * Counts all applications whose application number starts with the given year prefix.
     * Used to generate the sequential part of the application number (APP-YYYY-NNNNNN).
     *
     * @param yearPrefix the year prefix string, e.g. {@code "APP-2026-"}
     * @return the count of applications for that year
     */
    @Query("SELECT COUNT(a) FROM Application a WHERE a.applicationNumber LIKE :yearPrefix%")
    long countByApplicationNumberStartingWith(@Param("yearPrefix") String yearPrefix);
}
