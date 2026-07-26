package com.gov.subsidy.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity representing an uploaded document linked to a Subsidy Application.
 */
@Entity
@Table(name = "application_documents", indexes = {
        @Index(name = "idx_app_doc_application_id", columnList = "application_id"),
        @Index(name = "idx_app_doc_beneficiary_id", columnList = "beneficiary_id"),
        @Index(name = "idx_app_doc_scheme_id",     columnList = "scheme_id"),
        @Index(name = "idx_app_doc_type",          columnList = "document_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false,
                foreignKey = @ForeignKey(name = "fk_app_doc_application"))
    private Application application;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "beneficiary_id", nullable = false,
                foreignKey = @ForeignKey(name = "fk_app_doc_beneficiary"))
    private Beneficiary beneficiary;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "scheme_id", nullable = false,
                foreignKey = @ForeignKey(name = "fk_app_doc_scheme"))
    private Scheme scheme;

    @NotNull
    @Size(max = 150)
    @Column(name = "document_type", nullable = false, length = 150)
    private String documentType;

    @NotNull
    @Size(max = 255)
    @Column(name = "original_file_name", nullable = false, length = 255)
    private String originalFileName;

    @NotNull
    @Column(name = "storage_path", nullable = false, columnDefinition = "TEXT")
    private String storagePath;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "content_type", length = 100)
    private String contentType;

    @NotNull
    @Column(name = "upload_timestamp", nullable = false)
    private LocalDateTime uploadTimestamp;
}
