package com.gov.subsidy.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "compliances", indexes = {
        @Index(name = "idx_compliances_application_id", columnList = "application_id")
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

    @Column(name = "is_compliant", nullable = false)
    private boolean isCompliant;

    @NotBlank(message = "Checks run detail is required")
    @Size(max = 255, message = "Checks run detail must not exceed 255 characters")
    @Column(name = "checks_run", nullable = false, length = 255)
    private String checksRun;

    @Size(max = 500, message = "Remarks must not exceed 500 characters")
    @Column(name = "remarks", length = 500)
    private String remarks;

    @NotNull(message = "Check date is required")
    @Column(name = "check_date", nullable = false)
    private LocalDateTime checkDate;
}
