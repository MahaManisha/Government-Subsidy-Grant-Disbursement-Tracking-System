package com.gov.subsidy.entity;

import com.gov.subsidy.enums.DisbursementStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "disbursement_milestones", indexes = {
        @Index(name = "idx_milestones_plan_id", columnList = "disbursement_plan_id"),
        @Index(name = "idx_milestones_payment_status", columnList = "payment_status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisbursementMilestone extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "disbursement_plan_id", nullable = false, foreignKey = @ForeignKey(name = "fk_milestone_plan"))
    @NotNull(message = "Disbursement plan association is required")
    private DisbursementPlan disbursementPlan;

    @NotNull(message = "Milestone number is required")
    @Column(name = "milestone_number", nullable = false)
    private Integer milestoneNumber;

    @NotNull(message = "Percentage is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Percentage must be greater than zero")
    @Digits(integer = 3, fraction = 2, message = "Percentage limit exceeded")
    @Column(name = "percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal percentage;

    @NotNull(message = "Milestone amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Amount must be greater than zero")
    @Digits(integer = 15, fraction = 2, message = "Amount limit exceeded")
    @Column(name = "amount", nullable = false, precision = 17, scale = 2)
    private BigDecimal amount;

    @NotNull(message = "Scheduled date is required")
    @Column(name = "scheduled_date", nullable = false)
    private LocalDateTime scheduledDate;

    @NotNull(message = "Payment status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 30)
    private DisbursementStatus paymentStatus;

    @NotNull(message = "Remaining balance is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Remaining balance cannot be negative")
    @Digits(integer = 15, fraction = 2, message = "Remaining balance limit exceeded")
    @Column(name = "remaining_balance", nullable = false, precision = 17, scale = 2)
    private BigDecimal remainingBalance;
}
