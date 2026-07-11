package com.gov.subsidy.service;

import com.gov.subsidy.dto.*;
import com.gov.subsidy.entity.*;
import com.gov.subsidy.enums.*;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.ComplianceMapper;
import com.gov.subsidy.mapper.DisbursementPlanMapper;
import com.gov.subsidy.repository.*;
import com.gov.subsidy.service.impl.ComplianceServiceImpl;
import com.gov.subsidy.service.impl.DisbursementServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ComplianceServiceTest {

    @Mock
    private ComplianceRepository complianceRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private DisbursementRepository disbursementRepository;

    @Mock
    private DisbursementPlanRepository planRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private DisbursementMilestoneRepository milestoneRepository;

    @Mock
    private ComplianceMapper complianceMapper;

    @Mock
    private DisbursementPlanMapper planMapper;

    @InjectMocks
    private ComplianceServiceImpl complianceService;

    @InjectMocks
    private DisbursementServiceImpl disbursementService;

    private Application application;
    private Beneficiary beneficiary;
    private User officer;
    private DisbursementPlan plan;

    @BeforeEach
    public void setUp() {
        officer = User.builder().id(100L).username("finance_officer").build();
        beneficiary = Beneficiary.builder().id(5L).user(User.builder().firstName("John").lastName("Doe").build()).build();
        application = Application.builder()
                .id(1L)
                .applicationNumber("APP-2026-000001")
                .beneficiary(beneficiary)
                .workflowStatus(ApplicationStatus.APPROVED)
                .approvedAmount(BigDecimal.valueOf(100000))
                .build();

        DisbursementMilestone m1 = DisbursementMilestone.builder()
                .id(20L)
                .milestoneNumber(1)
                .percentage(BigDecimal.valueOf(40))
                .amount(BigDecimal.valueOf(40000))
                .paymentStatus(DisbursementStatus.PENDING)
                .build();

        DisbursementMilestone m2 = DisbursementMilestone.builder()
                .id(21L)
                .milestoneNumber(2)
                .percentage(BigDecimal.valueOf(60))
                .amount(BigDecimal.valueOf(60000))
                .paymentStatus(DisbursementStatus.PENDING)
                .build();

        plan = DisbursementPlan.builder()
                .id(10L)
                .application(application)
                .status(DisbursementPlanStatus.ACTIVE)
                .milestones(new ArrayList<>(Arrays.asList(m1, m2)))
                .build();

        m1.setDisbursementPlan(plan);
        m2.setDisbursementPlan(plan);
    }

    @Test
    public void testCreateComplianceRecord_Pending() {
        ComplianceRequestDto request = ComplianceRequestDto.builder()
                .applicationId(1L)
                .milestoneNumber(1)
                .build();

        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(complianceRepository.save(any(Compliance.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(complianceMapper.toDto(any(Compliance.class))).thenAnswer(invocation -> {
            Compliance c = invocation.getArgument(0);
            return ComplianceDto.builder()
                    .applicationId(c.getApplication().getId())
                    .status(c.getStatus().name())
                    .build();
        });

        ComplianceDto result = complianceService.createComplianceRecord(request);

        assertNotNull(result);
        assertEquals("PENDING", result.getStatus());
        verify(complianceRepository, times(1)).save(any(Compliance.class));
    }

    @Test
    public void testCreateComplianceRecord_UnderReview() {
        ComplianceRequestDto request = ComplianceRequestDto.builder()
                .applicationId(1L)
                .milestoneNumber(1)
                .uploadedProofMetadata("http://supabase.storage/proof.pdf")
                .build();

        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(complianceRepository.save(any(Compliance.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(complianceMapper.toDto(any(Compliance.class))).thenAnswer(invocation -> {
            Compliance c = invocation.getArgument(0);
            return ComplianceDto.builder()
                    .applicationId(c.getApplication().getId())
                    .status(c.getStatus().name())
                    .build();
        });

        ComplianceDto result = complianceService.createComplianceRecord(request);

        assertNotNull(result);
        assertEquals("UNDER_REVIEW", result.getStatus());
    }

    @Test
    public void testApproveCompliance_FinalMilestone() {
        Compliance compliance = Compliance.builder()
                .id(50L)
                .application(application)
                .beneficiary(beneficiary)
                .milestoneNumber(2) // Final milestone in a 2-milestone plan
                .status(ComplianceStatus.UNDER_REVIEW)
                .build();

        when(complianceRepository.findById(50L)).thenReturn(Optional.of(compliance));
        when(complianceRepository.save(any(Compliance.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(planRepository.findByApplicationId(1L)).thenReturn(Optional.of(plan));
        when(complianceMapper.toDto(any(Compliance.class))).thenAnswer(invocation -> {
            Compliance c = invocation.getArgument(0);
            return ComplianceDto.builder()
                    .id(c.getId())
                    .status(c.getStatus().name())
                    .build();
        });

        ComplianceDto result = complianceService.approveCompliance(50L);

        assertNotNull(result);
        assertEquals("COMPLIANT", result.getStatus());
        assertEquals(ApplicationStatus.DISBURSED, application.getWorkflowStatus());
        assertEquals(WorkflowStage.COMPLETED, application.getCurrentStage());
    }

    @Test
    public void testReleaseMilestone_FirstMilestoneSuccess() {
        when(planRepository.findById(10L)).thenReturn(Optional.of(plan));
        when(userRepository.findById(100L)).thenReturn(Optional.of(officer));
        when(disbursementRepository.save(any(Disbursement.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(planRepository.save(any(DisbursementPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(planMapper.toDto(any(DisbursementPlan.class))).thenAnswer(invocation -> {
            DisbursementPlan p = invocation.getArgument(0);
            return DisbursementPlanDto.builder().id(p.getId()).build();
        });

        // Release first milestone (requires no compliance)
        DisbursementPlanDto result = disbursementService.releaseMilestone(10L, 1, 100L);

        assertNotNull(result);
        assertEquals(DisbursementStatus.SUCCESS, plan.getMilestones().get(0).getPaymentStatus());
        assertEquals(ApplicationStatus.READY_FOR_DISBURSEMENT, application.getWorkflowStatus());
    }

    @Test
    public void testReleaseMilestone_SecondMilestoneFailsWithoutCompliance() {
        // Set first milestone as SUCCESS
        plan.getMilestones().get(0).setPaymentStatus(DisbursementStatus.SUCCESS);

        when(planRepository.findById(10L)).thenReturn(Optional.of(plan));
        // Mock that no compliance check has been approved (COMPLIANT) for milestone 1
        when(complianceRepository.existsByApplicationIdAndMilestoneNumberAndStatus(1L, 1, ComplianceStatus.COMPLIANT)).thenReturn(false);

        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            disbursementService.releaseMilestone(10L, 2, 100L);
        });

        assertTrue(exception.getMessage().contains("compliance verification for milestone 1 is mandatory"));
    }

    @Test
    public void testReleaseMilestone_SecondMilestoneSucceedsWithCompliance() {
        // Set first milestone as SUCCESS
        plan.getMilestones().get(0).setPaymentStatus(DisbursementStatus.SUCCESS);

        when(planRepository.findById(10L)).thenReturn(Optional.of(plan));
        when(userRepository.findById(100L)).thenReturn(Optional.of(officer));
        // Mock that compliance has been approved (COMPLIANT) for milestone 1
        when(complianceRepository.existsByApplicationIdAndMilestoneNumberAndStatus(1L, 1, ComplianceStatus.COMPLIANT)).thenReturn(true);
        when(disbursementRepository.save(any(Disbursement.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(planRepository.save(any(DisbursementPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(planMapper.toDto(any(DisbursementPlan.class))).thenAnswer(invocation -> {
            DisbursementPlan p = invocation.getArgument(0);
            return DisbursementPlanDto.builder().id(p.getId()).build();
        });

        // Release second milestone
        DisbursementPlanDto result = disbursementService.releaseMilestone(10L, 2, 100L);

        assertNotNull(result);
        assertEquals(DisbursementStatus.SUCCESS, plan.getMilestones().get(1).getPaymentStatus());
    }
}
