package com.gov.subsidy.entity;

import com.gov.subsidy.enums.ComplianceStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "compliances", indexes = {
        @Index(name = "idx_compliances_application_id", columnList = "application_id"),
        @Index(name = "idx_compliances_disbursement_id", columnList = "disbursement_id"),
        @Index(name = "idx_compliances_beneficiary_id", columnList = "beneficiary_id"),
        @Index(name = "idx_compliances_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Compliance extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false, foreignKey = @ForeignKey(name = "fk_compliance_application"))
    @NotNull(message = "Application association is required")
    private Application application;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "disbursement_id", foreignKey = @ForeignKey(name = "fk_compliance_disbursement"))
    private Disbursement disbursement;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "beneficiary_id", nullable = false, foreignKey = @ForeignKey(name = "fk_compliance_beneficiary"))
    @NotNull(message = "Beneficiary association is required")
    private Beneficiary beneficiary;

    @Column(name = "milestone_number")
    private Integer milestoneNumber;

    @Size(max = 255, message = "Proof metadata must not exceed 255 characters")
    @Column(name = "uploaded_proof_metadata", length = 255)
    private String uploadedProofMetadata;

    @Column(name = "inspection_date")
    private LocalDateTime inspectionDate;

    @Size(max = 500, message = "Officer remarks must not exceed 500 characters")
    @Column(name = "officer_remarks", length = 500)
    private String officerRemarks;

    @NotNull(message = "Compliance status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ComplianceStatus status;

    @Column(name = "next_due_date")
    private LocalDateTime nextDueDate;
}
