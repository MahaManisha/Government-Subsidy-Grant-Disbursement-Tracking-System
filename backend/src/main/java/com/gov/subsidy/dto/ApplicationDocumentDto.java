package com.gov.subsidy.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationDocumentDto {
    private Long id;
    private Long applicationId;
    private Long beneficiaryId;
    private Long schemeId;
    private String documentType;
    private String originalFileName;
    private String storagePath;
    private Long fileSize;
    private String contentType;
    private LocalDateTime uploadTimestamp;
}
