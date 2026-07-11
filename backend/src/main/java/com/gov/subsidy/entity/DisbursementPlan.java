package com.gov.subsidy.entity;

import com.gov.subsidy.enums.DisbursementPlanStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "disbursement_plans", indexes = {
        @Index(name = "idx_disbursement_plans_application_id", columnList = "application_id", unique = true),
        @Index(name = "idx_disbursement_plans_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisbursementPlan extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", unique = true, nullable = false, foreignKey = @ForeignKey(name = "fk_disbursement_plan_application"))
    @NotNull(message = "Application association is required")
    private Application application;

    @NotNull(message = "Plan status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private DisbursementPlanStatus status;

    @Column(name = "remarks", length = 500)
    private String remarks;

    @Builder.Default
    @OneToMany(mappedBy = "disbursementPlan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<DisbursementMilestone> milestones = new ArrayList<>();
}
