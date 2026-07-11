package com.gov.subsidy.mapper;

import com.gov.subsidy.dto.DisbursementMilestoneDto;
import com.gov.subsidy.dto.DisbursementPlanDto;
import com.gov.subsidy.entity.DisbursementMilestone;
import com.gov.subsidy.entity.DisbursementPlan;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class DisbursementPlanMapper {

    public DisbursementPlanDto toDto(DisbursementPlan entity) {
        if (entity == null) {
            return null;
        }

        return DisbursementPlanDto.builder()
                .id(entity.getId())
                .applicationId(entity.getApplication().getId())
                .applicationNumber(entity.getApplication().getApplicationNumber())
                .status(entity.getStatus() == null ? null : entity.getStatus().name())
                .remarks(entity.getRemarks())
                .milestones(toMilestoneDtoList(entity.getMilestones()))
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }

    public List<DisbursementMilestoneDto> toMilestoneDtoList(List<DisbursementMilestone> milestones) {
        if (milestones == null) {
            return Collections.emptyList();
        }
        return milestones.stream()
                .map(this::toMilestoneDto)
                .collect(Collectors.toList());
    }

    public DisbursementMilestoneDto toMilestoneDto(DisbursementMilestone milestone) {
        if (milestone == null) {
            return null;
        }
        return DisbursementMilestoneDto.builder()
                .id(milestone.getId())
                .milestoneNumber(milestone.getMilestoneNumber())
                .percentage(milestone.getPercentage())
                .amount(milestone.getAmount())
                .scheduledDate(milestone.getScheduledDate())
                .paymentStatus(milestone.getPaymentStatus() == null ? null : milestone.getPaymentStatus().name())
                .remainingBalance(milestone.getRemainingBalance())
                .createdAt(milestone.getCreatedAt())
                .updatedAt(milestone.getUpdatedAt())
                .createdBy(milestone.getCreatedBy())
                .updatedBy(milestone.getUpdatedBy())
                .build();
    }
}
