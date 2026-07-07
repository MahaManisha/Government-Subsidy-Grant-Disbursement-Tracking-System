package com.gov.subsidy.entity;

import com.gov.subsidy.enums.VerificationStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "verification_histories", indexes = {
        @Index(name = "idx_verif_histories_verif_id", columnList = "verification_id"),
        @Index(name = "idx_verif_histories_officer_id", columnList = "officer_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VerificationHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "verification_id", nullable = false, foreignKey = @ForeignKey(name = "fk_verification_history_verification"))
    @NotNull(message = "Verification association is required")
    private Verification verification;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "officer_id", nullable = false, foreignKey = @ForeignKey(name = "fk_verification_history_officer"))
    @NotNull(message = "Officer association is required")
    private User officer;

    @NotNull(message = "Verification status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private VerificationStatus status;

    @Size(max = 500, message = "Remarks must not exceed 500 characters")
    @Column(name = "remarks", length = 500)
    private String remarks;

    @NotNull(message = "Action date is required")
    @Column(name = "action_date", nullable = false)
    private LocalDateTime actionDate;
}
