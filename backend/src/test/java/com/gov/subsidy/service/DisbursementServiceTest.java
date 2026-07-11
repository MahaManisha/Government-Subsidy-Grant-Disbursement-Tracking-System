package com.gov.subsidy.service;

import com.gov.subsidy.dto.DisbursementMilestoneRequestDto;
import com.gov.subsidy.dto.DisbursementPlanDto;
import com.gov.subsidy.dto.DisbursementPlanRequestDto;
import com.gov.subsidy.dto.DisbursementPlanUpdateRequestDto;
import com.gov.subsidy.entity.Application;
import com.gov.subsidy.entity.DisbursementMilestone;
import com.gov.subsidy.entity.DisbursementPlan;
import com.gov.subsidy.enums.ApplicationStatus;
import com.gov.subsidy.enums.DisbursementPlanStatus;
import com.gov.subsidy.enums.DisbursementStatus;
import com.gov.subsidy.exception.DuplicateResourceException;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.DisbursementPlanMapper;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.DisbursementMilestoneRepository;
import com.gov.subsidy.repository.DisbursementPlanRepository;
import com.gov.subsidy.service.impl.DisbursementServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DisbursementServiceTest {

    @Mock
    private DisbursementPlanRepository planRepository;

    @Mock
    private DisbursementMilestoneRepository milestoneRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private DisbursementPlanMapper planMapper;

    @InjectMocks
    private DisbursementServiceImpl disbursementService;

    private Application approvedApplication;
    private Application submittedApplication;

    @BeforeEach
    public void setUp() {
        approvedApplication = Application.builder()
                .id(1L)
                .applicationNumber("APP-2026-000001")
                .approvedAmount(BigDecimal.valueOf(100000))
                .workflowStatus(ApplicationStatus.APPROVED)
                .build();

        submittedApplication = Application.builder()
                .id(2L)
                .applicationNumber("APP-2026-000002")
                .workflowStatus(ApplicationStatus.SUBMITTED)
                .build();
    }

    @Test
    public void testCreatePlan_Success() {
        DisbursementPlanRequestDto request = DisbursementPlanRequestDto.builder()
                .applicationId(1L)
                .remarks("Solar subsidy planning")
                .milestones(Arrays.asList(
                        new DisbursementMilestoneRequestDto(BigDecimal.valueOf(40)),
                        new DisbursementMilestoneRequestDto(BigDecimal.valueOf(30)),
                        new DisbursementMilestoneRequestDto(BigDecimal.valueOf(30))
                ))
                .build();

        when(applicationRepository.findById(1L)).thenReturn(Optional.of(approvedApplication));
        when(planRepository.existsByApplicationId(1L)).thenReturn(false);
        when(planRepository.save(any(DisbursementPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(planMapper.toDto(any(DisbursementPlan.class))).thenAnswer(invocation -> {
            DisbursementPlan plan = invocation.getArgument(0);
            return DisbursementPlanDto.builder()
                    .id(1L)
                    .applicationId(plan.getApplication().getId())
                    .applicationNumber(plan.getApplication().getApplicationNumber())
                    .status(plan.getStatus().name())
                    .remarks(plan.getRemarks())
                    .build();
        });

        DisbursementPlanDto result = disbursementService.createPlan(request);

        assertNotNull(result);
        assertEquals("ACTIVE", result.getStatus());
        assertEquals("Solar subsidy planning", result.getRemarks());
        verify(planRepository, times(1)).save(any(DisbursementPlan.class));
    }

    @Test
    public void testCreatePlan_ApplicationNotApproved() {
        DisbursementPlanRequestDto request = DisbursementPlanRequestDto.builder()
                .applicationId(2L)
                .milestones(Arrays.asList(
                        new DisbursementMilestoneRequestDto(BigDecimal.valueOf(100))
                ))
                .build();

        when(applicationRepository.findById(2L)).thenReturn(Optional.of(submittedApplication));

        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            disbursementService.createPlan(request);
        });

        assertTrue(exception.getMessage().contains("Application must be APPROVED"));
    }

    @Test
    public void testCreatePlan_DuplicatePlan() {
        DisbursementPlanRequestDto request = DisbursementPlanRequestDto.builder()
                .applicationId(1L)
                .milestones(Arrays.asList(
                        new DisbursementMilestoneRequestDto(BigDecimal.valueOf(100))
                ))
                .build();

        when(applicationRepository.findById(1L)).thenReturn(Optional.of(approvedApplication));
        when(planRepository.existsByApplicationId(1L)).thenReturn(true);

        Exception exception = assertThrows(DuplicateResourceException.class, () -> {
            disbursementService.createPlan(request);
        });

        assertTrue(exception.getMessage().contains("Disbursement plan already exists"));
    }

    @Test
    public void testCreatePlan_PercentageNot100() {
        DisbursementPlanRequestDto request = DisbursementPlanRequestDto.builder()
                .applicationId(1L)
                .milestones(Arrays.asList(
                        new DisbursementMilestoneRequestDto(BigDecimal.valueOf(40)),
                        new DisbursementMilestoneRequestDto(BigDecimal.valueOf(50))
                ))
                .build();

        when(applicationRepository.findById(1L)).thenReturn(Optional.of(approvedApplication));
        when(planRepository.existsByApplicationId(1L)).thenReturn(false);

        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            disbursementService.createPlan(request);
        });

        assertTrue(exception.getMessage().contains("Total milestone percentage must equal 100%"));
    }

    @Test
    public void testCancelPlan_Success() {
        DisbursementPlan plan = DisbursementPlan.builder()
                .id(10L)
                .application(approvedApplication)
                .status(DisbursementPlanStatus.ACTIVE)
                .milestones(new ArrayList<>(Arrays.asList(
                        DisbursementMilestone.builder().milestoneNumber(1).paymentStatus(DisbursementStatus.PENDING).build(),
                        DisbursementMilestone.builder().milestoneNumber(2).paymentStatus(DisbursementStatus.PROCESSING).build()
                )))
                .build();

        when(planRepository.findById(10L)).thenReturn(Optional.of(plan));
        when(planRepository.save(any(DisbursementPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(planMapper.toDto(any(DisbursementPlan.class))).thenAnswer(invocation -> {
            DisbursementPlan p = invocation.getArgument(0);
            return DisbursementPlanDto.builder()
                    .id(p.getId())
                    .status(p.getStatus().name())
                    .build();
        });

        DisbursementPlanDto result = disbursementService.cancelPlan(10L);

        assertNotNull(result);
        assertEquals("CANCELLED", result.getStatus());
        assertEquals(DisbursementStatus.FAILED, plan.getMilestones().get(0).getPaymentStatus());
        assertEquals(DisbursementStatus.FAILED, plan.getMilestones().get(1).getPaymentStatus());
    }
}
