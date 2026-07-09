package com.gov.subsidy.repository;

import com.gov.subsidy.entity.RoutingRecord;
import com.gov.subsidy.enums.RoutingDecision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoutingRecordRepository extends JpaRepository<RoutingRecord, Long> {

    /**
     * Find all routing records for a given application, ordered by routing time ascending
     * — gives the full audit trail of all routing decisions in chronological order.
     */
    List<RoutingRecord> findByApplicationIdOrderByRoutedAtAsc(Long applicationId);

    /**
     * Find the most recent routing record for an application.
     * Used to determine the current routing state.
     */
    Optional<RoutingRecord> findTopByApplicationIdOrderByRoutedAtDesc(Long applicationId);

    /**
     * Find all routing records for a specific assigned officer.
     */
    List<RoutingRecord> findByAssignedToId(Long assignedToId);

    /**
     * Find all routing records with a given decision type.
     */
    List<RoutingRecord> findByDecision(RoutingDecision decision);

    /**
     * Check whether any routing record exists for the given application.
     */
    boolean existsByApplicationId(Long applicationId);
}
