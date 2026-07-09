package com.gov.subsidy.entity;

import com.gov.subsidy.enums.RoutingDecision;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Persists every routing decision made by the Approval Routing Engine
 * for a given application, forming a complete audit trail.
 *
 * <p>A single application may have multiple records — one for the initial
 * auto-route and one for each subsequent escalation, reassignment, or rejection.</p>
 */
@Entity
@Table(name = "routing_records", indexes = {
        @Index(name = "idx_routing_application_id",  columnList = "application_id"),
        @Index(name = "idx_routing_assigned_to_id",  columnList = "assigned_to_id"),
        @Index(name = "idx_routing_decision",         columnList = "decision"),
        @Index(name = "idx_routing_actioned_by_id",  columnList = "actioned_by_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoutingRecord extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The application this routing decision belongs to. */
    @NotNull(message = "Application association is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false,
                foreignKey = @ForeignKey(name = "fk_routing_application"))
    private Application application;

    /** The routing decision that was made. */
    @NotNull(message = "Routing decision is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "decision", nullable = false, length = 30)
    private RoutingDecision decision;

    /**
     * The officer (User) this application was routed / assigned to.
     * Null when decision is FLAGGED or REJECTED (no officer assigned).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_id",
                foreignKey = @ForeignKey(name = "fk_routing_assigned_to"))
    private User assignedTo;

    /**
     * The officer or admin who triggered this routing action.
     * For AUTO_ROUTE this is {@code null} (system-generated).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actioned_by_id",
                foreignKey = @ForeignKey(name = "fk_routing_actioned_by"))
    private User actionedBy;

    /**
     * Captured eligibility score at the time of routing.
     * Stored for auditability — score may change if re-scored later.
     */
    @Column(name = "score_at_routing")
    private Integer scoreAtRouting;

    /**
     * Captured requested amount at the time of routing.
     * Stored for auditability.
     */
    @Column(name = "amount_at_routing", precision = 17, scale = 2)
    private java.math.BigDecimal amountAtRouting;

    /** Human-readable explanation of why this routing decision was made. */
    @Size(max = 1000, message = "Rationale must not exceed 1000 characters")
    @Column(name = "rationale", length = 1000)
    private String rationale;

    /** Optional remarks from the officer performing a manual action. */
    @Size(max = 500, message = "Remarks must not exceed 500 characters")
    @Column(name = "remarks", length = 500)
    private String remarks;

    /** Whether this was an automatic system decision (vs a manual one). */
    @Builder.Default
    @Column(name = "is_auto_routed", nullable = false)
    private boolean autoRouted = false;

    /** Timestamp when the routing action took place. */
    @NotNull
    @Column(name = "routed_at", nullable = false)
    private LocalDateTime routedAt;
}
