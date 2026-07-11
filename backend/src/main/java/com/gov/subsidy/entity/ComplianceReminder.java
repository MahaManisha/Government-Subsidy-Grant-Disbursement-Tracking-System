package com.gov.subsidy.entity;

import com.gov.subsidy.enums.ComplianceReminderType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "compliance_reminders", indexes = {
        @Index(name = "idx_reminders_compliance_id", columnList = "compliance_id"),
        @Index(name = "idx_reminders_recipient_id", columnList = "recipient_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplianceReminder extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "compliance_id", nullable = false, foreignKey = @ForeignKey(name = "fk_reminder_compliance"))
    @NotNull(message = "Compliance record is required")
    private Compliance compliance;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false, foreignKey = @ForeignKey(name = "fk_reminder_recipient"))
    @NotNull(message = "Recipient user is required")
    private User recipient;

    @NotNull(message = "Reminder type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "reminder_type", nullable = false, length = 30)
    private ComplianceReminderType reminderType;

    @Size(max = 50, message = "Sent channel description limit exceeded")
    @Column(name = "sent_via", nullable = false, length = 50)
    private String sentVia;

    @NotNull(message = "Sent timestamp is required")
    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @Size(max = 1000, message = "Message must not exceed 1000 characters")
    @Column(name = "message", nullable = false, length = 1000)
    private String message;
}
