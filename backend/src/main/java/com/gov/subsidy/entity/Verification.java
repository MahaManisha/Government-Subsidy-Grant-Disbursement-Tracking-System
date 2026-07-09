package com.gov.subsidy.entity;

import com.gov.subsidy.enums.VerificationStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "verifications", indexes = {
        @Index(name = "idx_verifications_application_id", columnList = "application_id", unique = true),
        @Index(name = "idx_verifications_field_officer_id", columnList = "field_officer_id"),
        @Index(name = "idx_verifications_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Verification extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", unique = true, nullable = false, foreignKey = @ForeignKey(name = "fk_verification_application"))
    @NotNull(message = "Application association is required")
    private Application application;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "field_officer_id", nullable = false, foreignKey = @ForeignKey(name = "fk_verification_field_officer"))
    @NotNull(message = "Field officer association is required")
    private User fieldOfficer;

    @NotNull(message = "Verification status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private VerificationStatus status;

    @Column(name = "verified_date")
    private LocalDateTime verifiedDate;

    @Size(max = 500, message = "Remarks must not exceed 500 characters")
    @Column(name = "remarks", length = 500)
    private String remarks;

    @Column(name = "geotag_latitude", precision = 10, scale = 7)
    private BigDecimal geotagLatitude;

    @Column(name = "geotag_longitude", precision = 10, scale = 7)
    private BigDecimal geotagLongitude;

    @Size(max = 255, message = "Document proof URL must not exceed 255 characters")
    @Column(name = "document_proof_url")
    private String documentProofUrl;
}
