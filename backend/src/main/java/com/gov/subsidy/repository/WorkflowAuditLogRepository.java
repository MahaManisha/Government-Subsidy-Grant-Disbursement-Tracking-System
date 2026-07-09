package com.gov.subsidy.repository;

import com.gov.subsidy.entity.WorkflowAuditLog;
import com.gov.subsidy.enums.WorkflowEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface WorkflowAuditLogRepository extends JpaRepository<WorkflowAuditLog, Long> {

    /** Full audit trail for an application, oldest first. */
    List<WorkflowAuditLog> findByApplicationIdOrderByOccurredAtAsc(Long applicationId);

    /** All audit entries of a specific event type across all applications. */
    List<WorkflowAuditLog> findByEvent(WorkflowEvent event);

    /** All audit entries for a specific application and event type. */
    List<WorkflowAuditLog> findByApplicationIdAndEvent(Long applicationId, WorkflowEvent event);

    /**
     * Find applications still in SUBMITTED/UNDER_REVIEW state with
     * lastModifiedDate older than the given cutoff — used by the SLA scanner.
     *
     * @param statuses list of ApplicationStatus values to check
     * @param cutoff   the earliest acceptable lastModifiedDate; anything before this is overdue
     */
    @Query("""
            SELECT DISTINCT w.application FROM WorkflowAuditLog w
            WHERE w.application.workflowStatus IN :statuses
              AND w.application.lastModifiedDate <= :cutoff
              AND w.event NOT IN ('AUTO_READY_FOR_DISBURSEMENT', 'APPLICATION_REJECTED')
            ORDER BY w.application.lastModifiedDate ASC
            """)
    List<com.gov.subsidy.entity.Application> findOverdueApplications(
            @Param("statuses") List<com.gov.subsidy.enums.ApplicationStatus> statuses,
            @Param("cutoff") LocalDateTime cutoff);

    /** Count entries per event type — useful for analytics. */
    @Query("SELECT w.event, COUNT(w) FROM WorkflowAuditLog w GROUP BY w.event")
    List<Object[]> countByEvent();
}
