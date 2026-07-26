package com.gov.subsidy.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationDocumentUploadDto {
    private String documentType;
    private String originalFileName;
    private String storagePath;
    private Long fileSize;
    private String contentType;
}
