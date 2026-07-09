package com.gov.subsidy.mapper;

import com.gov.subsidy.dto.VerificationDto;
import com.gov.subsidy.dto.VerificationHistoryDto;
import com.gov.subsidy.entity.Verification;
import com.gov.subsidy.entity.VerificationHistory;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Maps {@link Verification} and {@link VerificationHistory} entities
 * to their respective response DTOs.
 */
@Component
public class VerificationMapper {

    private final UserMapper userMapper;

    public VerificationMapper(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    // =========================================================================
    // Verification → VerificationDto
    // =========================================================================

    /**
     * Converts a {@link Verification} entity to a {@link VerificationDto},
     * optionally including the full audit history if provided.
     *
     * @param entity  the verification entity
     * @param history the list of history records to embed (may be empty)
     * @return the mapped DTO
     */
    public VerificationDto toDto(Verification entity, List<VerificationHistory> history) {
        if (entity == null) {
            return null;
        }

        List<VerificationHistoryDto> historyDtos = (history == null)
                ? Collections.emptyList()
                : history.stream().map(this::toHistoryDto).collect(Collectors.toList());

        return VerificationDto.builder()
                .id(entity.getId())
                // Application summary
                .applicationId(entity.getApplication() == null ? null : entity.getApplication().getId())
                .applicationNumber(entity.getApplication() == null ? null : entity.getApplication().getApplicationNumber())
                .workflowStatus(entity.getApplication() == null || entity.getApplication().getWorkflowStatus() == null
                        ? null : entity.getApplication().getWorkflowStatus().name())
                .currentStage(entity.getApplication() == null || entity.getApplication().getCurrentStage() == null
                        ? null : entity.getApplication().getCurrentStage().name())
                // Field officer
                .fieldOfficer(userMapper.toDto(entity.getFieldOfficer()))
                // Verification state
                .status(entity.getStatus() == null ? null : entity.getStatus().name())
                .verifiedDate(entity.getVerifiedDate())
                .remarks(entity.getRemarks())
                .geotagLatitude(entity.getGeotagLatitude())
                .geotagLongitude(entity.getGeotagLongitude())
                .documentProofUrl(entity.getDocumentProofUrl())
                // Audit trail
                .history(historyDtos)
                // Audit metadata
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }

    // =========================================================================
    // VerificationHistory → VerificationHistoryDto
    // =========================================================================

    /**
     * Converts a single {@link VerificationHistory} record to a DTO.
     *
     * @param entity the history entity
     * @return the mapped DTO
     */
    public VerificationHistoryDto toHistoryDto(VerificationHistory entity) {
        if (entity == null) {
            return null;
        }

        return VerificationHistoryDto.builder()
                .id(entity.getId())
                .verificationId(entity.getVerification() == null ? null : entity.getVerification().getId())
                .officer(userMapper.toDto(entity.getOfficer()))
                .status(entity.getStatus() == null ? null : entity.getStatus().name())
                .remarks(entity.getRemarks())
                .actionDate(entity.getActionDate())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }
}
