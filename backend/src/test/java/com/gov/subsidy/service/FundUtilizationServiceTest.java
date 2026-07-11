package com.gov.subsidy.service;

import com.gov.subsidy.dto.*;
import com.gov.subsidy.entity.*;
import com.gov.subsidy.enums.DisbursementStatus;
import com.gov.subsidy.enums.VerificationStatus;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.FundUtilizationMapper;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.DisbursementPlanRepository;
import com.gov.subsidy.repository.FundUtilizationRepository;
import com.gov.subsidy.service.impl.FundUtilizationServiceImpl;
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
public class FundUtilizationServiceTest {

    @Mock
    private FundUtilizationRepository utilizationRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private DisbursementPlanRepository planRepository;

    @Mock
    private FundUtilizationMapper utilizationMapper;

    @InjectMocks
    private FundUtilizationServiceImpl utilizationService;

    private Application application;
    private Beneficiary beneficiary;
    private DisbursementPlan plan;

    @BeforeEach
    public void setUp() {
        beneficiary = Beneficiary.builder().id(5L).build();
        application = Application.builder()
                .id(1L)
                .applicationNumber("APP-2026-000001")
                .beneficiary(beneficiary)
                .build();

        DisbursementMilestone milestone1 = DisbursementMilestone.builder()
                .id(20L)
                .milestoneNumber(1)
                .percentage(BigDecimal.valueOf(40))
                .amount(BigDecimal.valueOf(40000))
                .paymentStatus(DisbursementStatus.SUCCESS) // Released
                .build();

        DisbursementMilestone milestone2 = DisbursementMilestone.builder()
                .id(21L)
                .milestoneNumber(2)
                .percentage(BigDecimal.valueOf(60))
                .amount(BigDecimal.valueOf(60000))
                .paymentStatus(DisbursementStatus.PENDING) // Not released
                .build();

        plan = DisbursementPlan.builder()
                .id(10L)
                .application(application)
                .milestones(Arrays.asList(milestone1, milestone2))
                .build();
    }

    @Test
    public void testSubmitUtilization_Success() {
        FundUtilizationRequestDto request = FundUtilizationRequestDto.builder()
                .applicationId(1L)
                .amountUtilized(BigDecimal.valueOf(30000))
                .purpose("Buy solar panels")
                .build();

        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(planRepository.findByApplicationId(1L)).thenReturn(Optional.of(plan));
        when(utilizationRepository.findByApplicationId(1L)).thenReturn(Collections.emptyList());
        when(utilizationRepository.save(any(FundUtilization.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(utilizationMapper.toDto(any(FundUtilization.class))).thenAnswer(invocation -> {
            FundUtilization fu = invocation.getArgument(0);
            return FundUtilizationDto.builder()
                    .applicationId(fu.getApplication().getId())
                    .amountUtilized(fu.getAmountUtilized())
                    .status(fu.getStatus().name())
                    .build();
        });

        FundUtilizationDto result = utilizationService.submitUtilization(request);

        assertNotNull(result);
        assertEquals(BigDecimal.valueOf(30000), result.getAmountUtilized());
        assertEquals("PENDING", result.getStatus());
        verify(utilizationRepository, times(1)).save(any(FundUtilization.class));
    }

    @Test
    public void testSubmitUtilization_ExceedsReleasedAmount() {
        FundUtilizationRequestDto request = FundUtilizationRequestDto.builder()
                .applicationId(1L)
                .amountUtilized(BigDecimal.valueOf(45000)) // Released is 40,000
                .purpose("Buy solar panels")
                .build();

        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(planRepository.findByApplicationId(1L)).thenReturn(Optional.of(plan));
        when(utilizationRepository.findByApplicationId(1L)).thenReturn(Collections.emptyList());

        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            utilizationService.submitUtilization(request);
        });

        assertTrue(exception.getMessage().contains("Utilization amount exceeds total released disbursement amount"));
    }

    @Test
    public void testVerifyUtilization_Verified() {
        FundUtilization utilization = FundUtilization.builder()
                .id(8L)
                .application(application)
                .beneficiary(beneficiary)
                .amountUtilized(BigDecimal.valueOf(20000))
                .status(VerificationStatus.PENDING)
                .build();

        FundUtilizationVerificationDto verifyRequest = FundUtilizationVerificationDto.builder()
                .remarks("Receipts match works")
                .build();

        when(utilizationRepository.findById(8L)).thenReturn(Optional.of(utilization));
        when(utilizationRepository.save(any(FundUtilization.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(utilizationMapper.toDto(any(FundUtilization.class))).thenAnswer(invocation -> {
            FundUtilization fu = invocation.getArgument(0);
            return FundUtilizationDto.builder()
                    .id(fu.getId())
                    .status(fu.getStatus().name())
                    .remarks(fu.getRemarks())
                    .build();
        });

        FundUtilizationDto result = utilizationService.verifyUtilization(8L, VerificationStatus.VERIFIED, verifyRequest);

        assertNotNull(result);
        assertEquals("VERIFIED", result.getStatus());
        assertEquals("Receipts match works", result.getRemarks());
    }

    @Test
    public void testGetUtilizationSummary_CalculatesCorrectly() {
        FundUtilization u1 = FundUtilization.builder()
                .id(8L)
                .amountUtilized(BigDecimal.valueOf(20000))
                .status(VerificationStatus.VERIFIED)
                .build();

        FundUtilization u2 = FundUtilization.builder()
                .id(9L)
                .amountUtilized(BigDecimal.valueOf(10000))
                .status(VerificationStatus.PENDING)
                .build();

        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(planRepository.findByApplicationId(1L)).thenReturn(Optional.of(plan));
        when(utilizationRepository.findByApplicationId(1L)).thenReturn(Arrays.asList(u1, u2));

        FundUtilizationSummaryDto summary = utilizationService.getUtilizationSummary(1L);

        assertNotNull(summary);
        assertEquals(BigDecimal.valueOf(40000), summary.getTotalReleasedAmount()); // Milestones SUCCESS = 40,000
        assertEquals(BigDecimal.valueOf(20000), summary.getTotalUtilizedAmount()); // Verified only = 20,000
        assertEquals(BigDecimal.valueOf(20000), summary.getRemainingAmount()); // 40,000 - 20,000 = 20,000
        assertEquals(50.0, summary.getUtilizationPercentage()); // 20k / 40k = 50%
    }
}
