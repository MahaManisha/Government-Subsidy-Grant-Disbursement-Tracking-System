package com.gov.subsidy.repository;

import com.gov.subsidy.entity.Application;
import com.gov.subsidy.enums.ApplicationStatus;
import com.gov.subsidy.enums.WorkflowStage;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
