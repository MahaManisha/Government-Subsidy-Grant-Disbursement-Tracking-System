package com.gov.subsidy.entity;

import com.gov.subsidy.enums.ApplicationStatus;
import com.gov.subsidy.enums.EligibilityResult;
import com.gov.subsidy.enums.PriorityLevel;
import com.gov.subsidy.enums.WorkflowStage;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "applications", indexes = {
        @Index(name = "idx_applications_number", columnList = "application_number", unique = true),
        @Index(name = "idx_applications_beneficiary_id", columnList = "beneficiary_id"),
        @Index(name = "idx_applications_scheme_id", columnList = "scheme_id"),
        @Index(name = "idx_applications_officer_id", columnList = "assigned_officer_id"),
        @Index(name = "idx_applications_status", columnList = "workflow_status"),
        @Index(name = "idx_applications_stage", columnList = "current_stage")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Application extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "beneficiary_id", nullable = false, foreignKey = @ForeignKey(name = "fk_application_beneficiary"))
    @NotNull(message = "Beneficiary association is required")
    private Beneficiary beneficiary;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "scheme_id", nullable = false, foreignKey = @ForeignKey(name = "fk_application_scheme"))
    @NotNull(message = "Scheme association is required")
    private Scheme scheme;

    @NotBlank(message = "Application number is required")
    @Size(max = 50, message = "Application number must not exceed 50 characters")
    @Column(name = "application_number", unique = true, nullable = false, length = 50)
    private String applicationNumber;

    @NotNull(message = "Requested amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Requested amount must be greater than zero")
    @Digits(integer = 15, fraction = 2, message = "Requested amount limit exceeded")
    @Column(name = "requested_amount", nullable = false, precision = 17, scale = 2)
    private BigDecimal requestedAmount;

    @DecimalMin(value = "0.0", inclusive = true, message = "Approved amount cannot be negative")
    @Digits(integer = 15, fraction = 2, message = "Approved amount limit exceeded")
    @Column(name = "approved_amount", precision = 17, scale = 2)
    private BigDecimal approvedAmount;

    @NotNull(message = "Workflow status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "workflow_status", nullable = false, length = 30)
    private ApplicationStatus workflowStatus;

    @NotNull(message = "Current stage is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "current_stage", nullable = false, length = 30)
    private WorkflowStage currentStage;

    @Min(value = 0, message = "Eligibility score cannot be negative")
    @Max(value = 100, message = "Eligibility score cannot exceed 100")
    @Column(name = "eligibility_score")
    private Integer eligibilityScore;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "eligibility_result", nullable = false, length = 20)
    private EligibilityResult eligibilityResult = EligibilityResult.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_officer_id", foreignKey = @ForeignKey(name = "fk_application_assigned_officer"))
    private User assignedOfficer;

    @NotNull(message = "Submitted date is required")
    @Column(name = "submitted_date", nullable = false)
    private LocalDateTime submittedDate;

    @Column(name = "verified_date")
    private LocalDateTime verifiedDate;

    @Column(name = "approved_date")
    private LocalDateTime approvedDate;

    @Column(name = "last_modified_date")
    private LocalDateTime lastModifiedDate;

    @Size(max = 500, message = "Remarks must not exceed 500 characters")
    @Column(name = "remarks", length = 500)
    private String remarks;

    @NotNull(message = "Priority level is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 20)
    private PriorityLevel priority;

    @Builder.Default
    @Column(name = "is_flagged", nullable = false)
    private boolean isFlagged = false;

    @Builder.Default
    @Column(name = "re_verification_requested", nullable = false)
    private boolean reVerificationRequested = false;

    @Size(max = 255, message = "Rejection reason must not exceed 255 characters")
    @Column(name = "rejection_reason", length = 255)
    private String rejectionReason;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Application that = (Application) o;
        return Objects.equals(id, that.id) || Objects.equals(applicationNumber, that.applicationNumber);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, applicationNumber);
    }

    @Override
    public String toString() {
        return "Application{" +
                "id=" + id +
                ", applicationNumber='" + applicationNumber + '\'' +
                ", requestedAmount=" + requestedAmount +
                ", approvedAmount=" + approvedAmount +
                ", workflowStatus=" + workflowStatus +
                ", currentStage=" + currentStage +
                ", eligibilityScore=" + eligibilityScore +
                ", priority=" + priority +
                ", isFlagged=" + isFlagged +
                '}';
    }
}
