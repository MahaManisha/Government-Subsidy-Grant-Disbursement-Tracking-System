package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.ApplicationDocumentDto;
import com.gov.subsidy.dto.ApplicationDocumentUploadDto;
import com.gov.subsidy.dto.BaseResponse;
import com.gov.subsidy.entity.Application;
import com.gov.subsidy.entity.ApplicationDocument;
import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.entity.Scheme;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.repository.ApplicationDocumentRepository;
import com.gov.subsidy.repository.ApplicationRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX)
@Tag(name = "Document Management", description = "Endpoints for uploading and retrieving application documents")
public class DocumentController {

    private final ApplicationDocumentRepository documentRepository;
    private final ApplicationRepository applicationRepository;

    public DocumentController(ApplicationDocumentRepository documentRepository,
                              ApplicationRepository applicationRepository) {
        this.documentRepository = documentRepository;
        this.applicationRepository = applicationRepository;
    }

    @GetMapping("/applications/{applicationId}/documents")
    @Operation(summary = "Get all documents uploaded for an application")
    public ResponseEntity<BaseResponse<List<ApplicationDocumentDto>>> getApplicationDocuments(
            @PathVariable Long applicationId) {
        List<ApplicationDocument> docs = documentRepository.findByApplicationId(applicationId);
        List<ApplicationDocumentDto> dtoList = docs.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(BaseResponse.success(dtoList, "Uploaded documents retrieved successfully"));
    }

    @PostMapping("/applications/{applicationId}/documents")
    @Operation(summary = "Attach an uploaded document record to an existing application")
    public ResponseEntity<BaseResponse<ApplicationDocumentDto>> attachDocument(
            @PathVariable Long applicationId,
            @RequestBody ApplicationDocumentUploadDto uploadDto) {

        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with ID: " + applicationId));

        ApplicationDocument doc = ApplicationDocument.builder()
                .application(application)
                .beneficiary(application.getBeneficiary())
                .scheme(application.getScheme())
                .documentType(uploadDto.getDocumentType())
                .originalFileName(uploadDto.getOriginalFileName())
                .storagePath(uploadDto.getStoragePath() != null ? uploadDto.getStoragePath() : "uploads/documents/" + uploadDto.getOriginalFileName())
                .fileSize(uploadDto.getFileSize() != null ? uploadDto.getFileSize() : 1024L)
                .contentType(uploadDto.getContentType() != null ? uploadDto.getContentType() : "application/octet-stream")
                .uploadTimestamp(LocalDateTime.now())
                .build();

        ApplicationDocument saved = documentRepository.save(doc);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(BaseResponse.success(toDto(saved), "Document attached successfully"));
    }

    @PostMapping("/documents/file-upload")
    @Operation(summary = "Upload physical file and receive storage path/URL")
    public ResponseEntity<BaseResponse<ApplicationDocumentUploadDto>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("documentType") String documentType) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(BaseResponse.error("File is empty"));
        }

        try {
            String uploadDir = "uploads/documents/";
            File dir = new File(uploadDir);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            String filename = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Path filePath = Paths.get(uploadDir + filename);
            Files.write(filePath, file.getBytes());

            ApplicationDocumentUploadDto result = ApplicationDocumentUploadDto.builder()
                    .documentType(documentType)
                    .originalFileName(file.getOriginalFilename())
                    .storagePath(filePath.toString())
                    .fileSize(file.getSize())
                    .contentType(file.getContentType())
                    .build();

            return ResponseEntity.ok(BaseResponse.success(result, "File uploaded successfully"));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(BaseResponse.error("Failed to store file: " + e.getMessage()));
        }
    }

    private ApplicationDocumentDto toDto(ApplicationDocument doc) {
        return ApplicationDocumentDto.builder()
                .id(doc.getId())
                .applicationId(doc.getApplication() != null ? doc.getApplication().getId() : null)
                .beneficiaryId(doc.getBeneficiary() != null ? doc.getBeneficiary().getId() : null)
                .schemeId(doc.getScheme() != null ? doc.getScheme().getId() : null)
                .documentType(doc.getDocumentType())
                .originalFileName(doc.getOriginalFileName())
                .storagePath(doc.getStoragePath())
                .fileSize(doc.getFileSize())
                .contentType(doc.getContentType())
                .uploadTimestamp(doc.getUploadTimestamp())
                .build();
    }
}
