package com.gov.subsidy.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_logs_action", columnList = "action"),
        @Index(name = "idx_audit_logs_performed_by", columnList = "performed_by"),
        @Index(name = "idx_audit_logs_timestamp", columnList = "timestamp")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Action is required")
    @Size(max = 100, message = "Action description must not exceed 100 characters")
    @Column(name = "action", nullable = false, length = 100)
    private String action;

    @NotBlank(message = "User is required")
    @Size(max = 100, message = "User reference must not exceed 100 characters")
    @Column(name = "performed_by", nullable = false, length = 100)
    private String performedBy;

    @Size(max = 2000, message = "Details must not exceed 2000 characters")
    @Column(name = "details", length = 2000)
    private String details;

    @NotNull(message = "Timestamp is required")
    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;

    @Size(max = 45, message = "IP Address must not exceed 45 characters")
    @Column(name = "ip_address", length = 45)
    private String ipAddress;
}
