package com.gov.subsidy.service;

import com.gov.subsidy.dto.ApplicationCreateDto;
import com.gov.subsidy.dto.ApplicationDto;
import com.gov.subsidy.entity.Application;
import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.entity.Scheme;
import com.gov.subsidy.entity.User;
import com.gov.subsidy.enums.ApplicationStatus;
import com.gov.subsidy.enums.BeneficiaryCategory;
import com.gov.subsidy.enums.EligibilityResult;
import com.gov.subsidy.enums.Gender;
import com.gov.subsidy.enums.PriorityLevel;
import com.gov.subsidy.enums.RoleType;
import com.gov.subsidy.enums.SchemeStatus;
import com.gov.subsidy.enums.VerificationStatus;
import com.gov.subsidy.enums.WorkflowStage;
import com.gov.subsidy.mapper.ApplicationMapper;
import com.gov.subsidy.repository.ApplicationDocumentRepository;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.BeneficiaryRepository;
import com.gov.subsidy.repository.SchemeRepository;
import com.gov.subsidy.repository.UserRepository;
import com.gov.subsidy.repository.VerificationHistoryRepository;
import com.gov.subsidy.repository.VerificationRepository;
import com.gov.subsidy.service.impl.ApplicationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EligibilityEngineTest {

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private BeneficiaryRepository beneficiaryRepository;

    @Mock
    private SchemeRepository schemeRepository;

    @Mock
    private ApplicationMapper applicationMapper;

    @Mock
    private UserRepository userRepository;

    @Mock
    private VerificationRepository verificationRepository;

    @Mock
    private VerificationHistoryRepository verificationHistoryRepository;

    @Mock
    private ApplicationDocumentRepository documentRepository;

    @Mock
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @InjectMocks
    private ApplicationServiceImpl applicationService;

    private Beneficiary beneficiary;
    private Scheme scheme;
    private ApplicationCreateDto createDto;

    @BeforeEach
    public void setup() {
        beneficiary = Beneficiary.builder()
                .id(1L)
                .uniqueIdNumber("123456789012")
                .phoneNumber("9876543210")
                .address("Test Address")
                .bankAccountNumber("918273645281")
                .bankIfscCode("SBIN0001234")
                .dateOfBirth(LocalDate.now().minusYears(30)) // 30 years old
                .annualIncome(BigDecimal.valueOf(150000))
                .eligibilityStatus(VerificationStatus.VERIFIED)
                .gender(Gender.MALE)
                .category(BeneficiaryCategory.OBC)
                .occupation("Farmer")
                .state("Gujarat")
                .district("Gandhinagar")
                .build();

        scheme = Scheme.builder()
                .id(1L)
                .name("Pradhan Mantri Fasal Bima Yojana")
                .code("PMFBY-2026")
                .description("Crop insurance scheme.")
                .budgetAllocation(BigDecimal.valueOf(50000000))
                .remainingBudget(BigDecimal.valueOf(50000000))
                .startDate(LocalDate.now().minusDays(10))
                .endDate(LocalDate.now().plusDays(10))
                .active(true)
                .status(SchemeStatus.ACTIVE)
                .minAge(18)
                .maxAge(60)
                .maxAnnualIncome(BigDecimal.valueOf(300000))
                .gender("ANY")
                .category("ANY")
                .occupation("ANY")
                .state("ANY")
                .district("ANY")
                .requiredDocuments(null)
                .maxGrantAmount(BigDecimal.valueOf(100000))
                .build();

        createDto = ApplicationCreateDto.builder()
                .beneficiaryId(1L)
                .schemeId(1L)
                .requestedAmount(BigDecimal.valueOf(50000))
                .priorityTier("MEDIUM")
                .build();
    }

    @Test
    public void testSubmitApplication_Eligible_Success() {
        when(beneficiaryRepository.findById(1L)).thenReturn(Optional.of(beneficiary));
        when(schemeRepository.findById(1L)).thenReturn(Optional.of(scheme));
        when(applicationRepository.existsByBeneficiaryIdAndSchemeId(1L, 1L)).thenReturn(false);
        when(applicationRepository.countByApplicationNumberStartingWith(anyString())).thenReturn(0L);
        when(applicationRepository.existsByApplicationNumber(anyString())).thenReturn(false);

        User officer = new User();
        officer.setId(10L);
        officer.setUsername("fieldofficer1");
        when(userRepository.findLeastLoadedActiveUsersByRole(RoleType.ROLE_FIELD_OFFICER))
                .thenReturn(Collections.singletonList(officer));

        when(applicationRepository.save(any(Application.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(applicationMapper.toDto(any(Application.class))).thenAnswer(invocation -> {
            Application app = invocation.getArgument(0);
            return ApplicationDto.builder()
                    .id(1L)
                    .applicationNumber(app.getApplicationNumber())
                    .workflowStatus(app.getWorkflowStatus().name())
                    .currentStage(app.getCurrentStage().name())
                    .eligibilityScore(app.getEligibilityScore())
                    .build();
        });

        ApplicationDto result = applicationService.submitApplication(createDto);

        assertNotNull(result);
        assertEquals("ELIGIBILITY_VERIFIED", result.getWorkflowStatus());
        assertEquals("FIELD_VERIFICATION_PENDING", result.getCurrentStage());
        verify(verificationRepository, times(1)).save(any());
        verify(verificationHistoryRepository, times(1)).save(any());
    }

    @Test
    public void testSubmitApplication_Ineligible_AgeLimitFail() {
        beneficiary.setDateOfBirth(LocalDate.now().minusYears(15)); // 15 years old (fails minAge 18)

        when(beneficiaryRepository.findById(1L)).thenReturn(Optional.of(beneficiary));
        when(schemeRepository.findById(1L)).thenReturn(Optional.of(scheme));
        when(applicationRepository.existsByBeneficiaryIdAndSchemeId(1L, 1L)).thenReturn(false);
        when(applicationRepository.countByApplicationNumberStartingWith(anyString())).thenReturn(0L);
        when(applicationRepository.existsByApplicationNumber(anyString())).thenReturn(false);

        when(applicationRepository.save(any(Application.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(applicationMapper.toDto(any(Application.class))).thenAnswer(invocation -> {
            Application app = invocation.getArgument(0);
            return ApplicationDto.builder()
                    .id(1L)
                    .applicationNumber(app.getApplicationNumber())
                    .workflowStatus(app.getWorkflowStatus().name())
                    .currentStage(app.getCurrentStage().name())
                    .eligibilityScore(app.getEligibilityScore())
                    .rejectionReason(app.getRejectionReason())
                    .build();
        });

        ApplicationDto result = applicationService.submitApplication(createDto);

        assertNotNull(result);
        assertEquals("ELIGIBILITY_REJECTED", result.getWorkflowStatus());
        assertTrue(result.getRejectionReason().toLowerCase().contains("minimum"));
        verify(verificationRepository, never()).save(any());
    }
}
