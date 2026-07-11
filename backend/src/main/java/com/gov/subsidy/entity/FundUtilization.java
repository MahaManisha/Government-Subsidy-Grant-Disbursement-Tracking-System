package com.gov.subsidy.entity;

import com.gov.subsidy.enums.VerificationStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "fund_utilizations", indexes = {
        @Index(name = "idx_utilizations_application_id", columnList = "application_id"),
        @Index(name = "idx_utilizations_disbursement_id", columnList = "disbursement_id"),
        @Index(name = "idx_utilizations_beneficiary_id", columnList = "beneficiary_id"),
        @Index(name = "idx_utilizations_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FundUtilization extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false, foreignKey = @ForeignKey(name = "fk_utilization_application"))
    @NotNull(message = "Application association is required")
    private Application application;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "disbursement_id", foreignKey = @ForeignKey(name = "fk_utilization_disbursement"))
    private Disbursement disbursement;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "beneficiary_id", nullable = false, foreignKey = @ForeignKey(name = "fk_utilization_beneficiary"))
    @NotNull(message = "Beneficiary association is required")
    private Beneficiary beneficiary;

    @NotNull(message = "Amount utilized is required")
    @DecimalMin(value = "0.01", message = "Amount utilized must be greater than zero")
    @Column(name = "amount_utilized", nullable = false, precision = 17, scale = 2)
    private BigDecimal amountUtilized;

    @Size(max = 255, message = "Purpose description limit exceeded")
    @Column(name = "purpose", length = 255)
    private String purpose;

    @Size(max = 500, message = "Supporting documents metadata limit exceeded")
    @Column(name = "supporting_docs_metadata", length = 500)
    private String supportingDocsMetadata;

    @Size(max = 500, message = "Officer remarks limit exceeded")
    @Column(name = "remarks", length = 500)
    private String remarks;

    @NotNull(message = "Submission date is required")
    @Column(name = "submission_date", nullable = false)
    private LocalDateTime submissionDate;

    @NotNull(message = "Verification status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private VerificationStatus status;
}
