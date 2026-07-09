package com.gov.subsidy.repository;

import com.gov.subsidy.entity.VerificationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VerificationHistoryRepository extends JpaRepository<VerificationHistory, Long> {

    /**
     * Retrieve the full audit trail for a given verification record,
     * ordered by action date ascending (oldest first).
     */
    List<VerificationHistory> findByVerificationIdOrderByActionDateAsc(Long verificationId);

    /**
     * Retrieve all history records actioned by a particular officer.
     */
    List<VerificationHistory> findByOfficerId(Long officerId);
}
