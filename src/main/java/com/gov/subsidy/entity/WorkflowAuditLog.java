package com.gov.subsidy.entity;

import com.gov.subsidy.enums.ApplicationStatus;
import com.gov.subsidy.enums.WorkflowEvent;
import com.gov.subsidy.enums.WorkflowStage;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Immutable audit record for every event that occurs within the Workflow Automation engine.
 *
 * <p>A new {@code WorkflowAuditLog} is appended every time an application transitions
 * between stages, is escalated, times out, or triggers a notification. Records are
 * never updated or deleted — they form a tamper-evident timeline for compliance.</p>
 *
 * <p>Fields {@code fromStatus}/{@code toStatus} and {@code fromStage}/{@code toStage}
 * capture the before/after snapshot so the full transition can be replayed exactly.</p>
 */
@Entity
@Table(name = "workflow_audit_logs", indexes = {
        @Index(name = "idx_wf_audit_application_id", columnList = "application_id"),
        @Index(name = "idx_wf_audit_event",          columnList = "event"),
        @Index(name = "idx_wf_audit_occurred_at",    columnList = "occurred_at"),
        @Index(name = "idx_wf_audit_triggered_by_id",columnList = "triggered_by_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The application this log entry belongs to. */
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false,
                foreignKey = @ForeignKey(name = "fk_wf_audit_application"))
    private Application application;

    /** The type of event that occurred. */
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "event", nullable = false, length = 40)
    private WorkflowEvent event;

    /** Application status BEFORE this transition. */
    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 30)
    private ApplicationStatus fromStatus;

    /** Application status AFTER this transition. */
    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", length = 30)
    private ApplicationStatus toStatus;

    /** Workflow stage BEFORE this transition. */
    @Enumerated(EnumType.STRING)
    @Column(name = "from_stage", length = 30)
    private WorkflowStage fromStage;

    /** Workflow stage AFTER this transition. */
    @Enumerated(EnumType.STRING)
    @Column(name = "to_stage", length = 30)
    private WorkflowStage toStage;

    /**
     * The user (officer/system) who triggered this event.
     * {@code null} for fully automated (scheduler-driven) events.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "triggered_by_id",
                foreignKey = @ForeignKey(name = "fk_wf_audit_triggered_by"))
    private User triggeredBy;

    /**
     * {@code "SYSTEM"} for automated events, or the username of the acting officer.
     * Stored as a plain string so the log is readable even if the User record is deleted.
     */
    @Column(name = "actor", length = 100)
    private String actor;

    /** Human-readable description of what the engine did and why. */
    @Size(max = 2000)
    @Column(name = "description", length = 2000)
    private String description;

    /**
     * If a SLA was breached, this records how many hours the application was overdue.
     * {@code null} for non-timeout events.
     */
    @Column(name = "sla_breach_hours")
    private Long slaBreachHours;

    /** Whether this event was triggered by the automated scheduler (vs. a human). */
    @Builder.Default
    @Column(name = "automated", nullable = false)
    private boolean automated = false;

    /** Exact timestamp when this event occurred. Never null. */
    @NotNull
    @Column(name = "occurred_at", nullable = false, updatable = false)
    private LocalDateTime occurredAt;
}
