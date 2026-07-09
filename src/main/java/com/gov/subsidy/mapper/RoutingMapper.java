package com.gov.subsidy.mapper;

import com.gov.subsidy.dto.RoutingRecordDto;
import com.gov.subsidy.entity.RoutingRecord;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Maps {@link RoutingRecord} entities to {@link RoutingRecordDto} response objects.
 */
@Component
public class RoutingMapper {

    private final UserMapper userMapper;

    public RoutingMapper(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    public RoutingRecordDto toDto(RoutingRecord entity) {
        if (entity == null) return null;

        return RoutingRecordDto.builder()
                .id(entity.getId())
                .applicationId(entity.getApplication() == null ? null : entity.getApplication().getId())
                .applicationNumber(entity.getApplication() == null ? null : entity.getApplication().getApplicationNumber())
                .decision(entity.getDecision() == null ? null : entity.getDecision().name())
                .assignedTo(userMapper.toDto(entity.getAssignedTo()))
                .actionedBy(userMapper.toDto(entity.getActionedBy()))
                .scoreAtRouting(entity.getScoreAtRouting())
                .amountAtRouting(entity.getAmountAtRouting())
                .rationale(entity.getRationale())
                .remarks(entity.getRemarks())
                .autoRouted(entity.isAutoRouted())
                .routedAt(entity.getRoutedAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public List<RoutingRecordDto> toDtoList(List<RoutingRecord> entities) {
        return entities.stream().map(this::toDto).collect(Collectors.toList());
    }
}
