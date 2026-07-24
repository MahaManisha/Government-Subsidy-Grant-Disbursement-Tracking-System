package com.gov.subsidy.mapper;

import com.gov.subsidy.dto.SchemeCreateDto;
import com.gov.subsidy.dto.SchemeDto;
import com.gov.subsidy.entity.Scheme;
import com.gov.subsidy.enums.SchemeStatus;
import org.springframework.stereotype.Component;

@Component
public class SchemeMapper implements GenericMapper<Scheme, SchemeDto> {

    @Override
    public SchemeDto toDto(Scheme entity) {
        if (entity == null) {
            return null;
        }

        return SchemeDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .code(entity.getCode())
                .description(entity.getDescription())
                .budgetAllocation(entity.getBudgetAllocation())
                .remainingBudget(entity.getRemainingBudget())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .active(entity.isActive())
                .status(entity.getStatus() == null ? null : entity.getStatus().name())
                .minAge(entity.getMinAge())
                .maxAge(entity.getMaxAge())
                .maxAnnualIncome(entity.getMaxAnnualIncome())
                .gender(entity.getGender())
                .category(entity.getCategory())
                .occupation(entity.getOccupation())
                .state(entity.getState())
                .district(entity.getDistrict())
                .requiredDocuments(entity.getRequiredDocuments())
                .maxGrantAmount(entity.getMaxGrantAmount())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }

    @Override
    public Scheme toEntity(SchemeDto dto) {
        if (dto == null) {
            return null;
        }

        Scheme scheme = Scheme.builder()
                .id(dto.getId())
                .name(dto.getName())
                .code(dto.getCode())
                .description(dto.getDescription())
                .budgetAllocation(dto.getBudgetAllocation())
                .remainingBudget(dto.getRemainingBudget())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .active(dto.isActive())
                .status(dto.getStatus() == null ? null : SchemeStatus.valueOf(dto.getStatus()))
                .minAge(dto.getMinAge())
                .maxAge(dto.getMaxAge())
                .maxAnnualIncome(dto.getMaxAnnualIncome())
                .gender(dto.getGender())
                .category(dto.getCategory())
                .occupation(dto.getOccupation())
                .state(dto.getState())
                .district(dto.getDistrict())
                .requiredDocuments(dto.getRequiredDocuments())
                .maxGrantAmount(dto.getMaxGrantAmount())
                .build();

        scheme.setCreatedAt(dto.getCreatedAt());
        scheme.setUpdatedAt(dto.getUpdatedAt());
        scheme.setCreatedBy(dto.getCreatedBy());
        scheme.setUpdatedBy(dto.getUpdatedBy());
        return scheme;
    }

    public Scheme toEntity(SchemeCreateDto createDto) {
        if (createDto == null) {
            return null;
        }

        return Scheme.builder()
                .name(createDto.getName())
                .code(createDto.getCode())
                .description(createDto.getDescription())
                .budgetAllocation(createDto.getBudgetAllocation())
                .remainingBudget(createDto.getBudgetAllocation())
                .startDate(createDto.getStartDate())
                .endDate(createDto.getEndDate())
                .active(true)
                .status(createDto.getStatus() == null ? null : SchemeStatus.valueOf(createDto.getStatus()))
                .minAge(createDto.getMinAge())
                .maxAge(createDto.getMaxAge())
                .maxAnnualIncome(createDto.getMaxAnnualIncome())
                .gender(createDto.getGender())
                .category(createDto.getCategory())
                .occupation(createDto.getOccupation())
                .state(createDto.getState())
                .district(createDto.getDistrict())
                .requiredDocuments(createDto.getRequiredDocuments())
                .maxGrantAmount(createDto.getMaxGrantAmount())
                .build();
    }
}
