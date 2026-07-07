package com.gov.subsidy.entity;

import com.gov.subsidy.enums.DisbursementStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "disbursements", indexes = {
        @Index(name = "idx_disbursements_application_id", columnList = "application_id", unique = true),
        @Index(name = "idx_disbursements_finance_officer_id", columnList = "finance_officer_id"),
        @Index(name = "idx_disbursements_status", columnList = "status"),
        @Index(name = "idx_disbursements_transaction_id", columnList = "transaction_id", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Disbursement extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", unique = true, nullable = false, foreignKey = @ForeignKey(name = "fk_disbursement_application"))
    @NotNull(message = "Application association is required")
    private Application application;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "finance_officer_id", nullable = false, foreignKey = @ForeignKey(name = "fk_disbursement_finance_officer"))
    @NotNull(message = "Finance officer association is required")
    private User financeOfficer;

    @NotNull(message = "Disbursement amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Amount must be greater than zero")
    @Digits(integer = 15, fraction = 2, message = "Amount limit exceeded")
    @Column(name = "amount", nullable = false, precision = 17, scale = 2)
    private BigDecimal amount;

    @NotNull(message = "Disbursement status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private DisbursementStatus status;

    @Size(max = 100, message = "Transaction ID must not exceed 100 characters")
    @Column(name = "transaction_id", unique = true, length = 100)
    private String transactionId;

    @Column(name = "disbursement_date")
    private LocalDateTime disbursementDate;

    @Size(max = 500, message = "Remarks must not exceed 500 characters")
    @Column(name = "remarks", length = 500)
    private String remarks;
}
