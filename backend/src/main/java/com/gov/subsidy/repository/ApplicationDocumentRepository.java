package com.gov.subsidy.repository;

import com.gov.subsidy.entity.ApplicationDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApplicationDocumentRepository extends JpaRepository<ApplicationDocument, Long> {

    List<ApplicationDocument> findByApplicationId(Long applicationId);

    List<ApplicationDocument> findByBeneficiaryId(Long beneficiaryId);

    boolean existsByBeneficiaryId(Long beneficiaryId);

    List<ApplicationDocument> findByApplicationIdAndDocumentType(Long applicationId, String documentType);

    boolean existsByApplicationIdAndDocumentType(Long applicationId, String documentType);
}
