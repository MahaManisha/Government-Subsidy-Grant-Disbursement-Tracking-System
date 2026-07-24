package com.gov.subsidy.service;

import com.gov.subsidy.config.EligibilityScoringConfig;
import com.gov.subsidy.dto.EligibilityScoringResponseDto;
import com.gov.subsidy.eligibility.EligibilityRule;
import com.gov.subsidy.eligibility.rules.*;
import com.gov.subsidy.entity.Application;
import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.enums.*;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.service.impl.EligibilityServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the Eligibility Scoring Engine (Module 2 / Milestone 2).
 *
 * <p>Covers both the individual {@link EligibilityRule} strategy implementations
 * and the orchestrating {@link EligibilityServiceImpl}, using the real rule
 * classes wired against a default {@link EligibilityScoringConfig} (no Spring
 * context needed since the config is a plain POJO with default field values).</p>
 */
@ExtendWith(MockitoExtension.class)
public class EligibilityServiceImplTest {

    @Mock
    private ApplicationRepository applicationRepository;

    private EligibilityScoringConfig config;
    private List<EligibilityRule> rules;
    private EligibilityServiceImpl eligibilityService;

    @BeforeEach
    public void setUp() {
        config = new EligibilityScoringConfig(); // defaults: 40/20/10/10/20, threshold 80
        rules = List.of(
                new IncomeCriteriaRule(config),
                new CategoryCriteriaRule(config),
                new GenderCriteriaRule(config),
                new SeniorCitizenRule(config),
                new DocumentsCompleteRule(config)
        );
        eligibilityService = new EligibilityServiceImpl(applicationRepository, rules, config);
    }

    // ---------------------------------------------------------------------
    // Individual rule tests
    // ---------------------------------------------------------------------

    @Test
    public void incomeRule_awardsPoints_whenBelowThreshold() {
        Beneficiary b = Beneficiary.builder().annualIncome(BigDecimal.valueOf(150_000)).build();
        assertEquals(40, new IncomeCriteriaRule(config).evaluate(b));
    }

    @Test
    public void incomeRule_awardsZero_whenAtOrAboveThreshold() {
        Beneficiary b = Beneficiary.builder().annualIncome(BigDecimal.valueOf(200_000)).build();
        assertEquals(0, new IncomeCriteriaRule(config).evaluate(b));
    }

    @Test
    public void categoryRule_awardsPoints_forScOrSt() {
        Beneficiary sc = Beneficiary.builder().category(BeneficiaryCategory.SC).build();
        Beneficiary general = Beneficiary.builder().category(BeneficiaryCategory.GENERAL).build();
        assertEquals(20, new CategoryCriteriaRule(config).evaluate(sc));
        assertEquals(0, new CategoryCriteriaRule(config).evaluate(general));
    }

    @Test
    public void seniorCitizenRule_awardsZero_whenDateOfBirthMissing() {
        Beneficiary b = Beneficiary.builder().dateOfBirth(null).build();
        assertEquals(0, new SeniorCitizenRule(config).evaluate(b));
    }

    @Test
    public void seniorCitizenRule_awardsPoints_whenAgeAtOrAboveThreshold() {
        Beneficiary b = Beneficiary.builder().dateOfBirth(LocalDate.now().minusYears(65)).build();
        assertEquals(10, new SeniorCitizenRule(config).evaluate(b));
    }

    @Test
    public void documentsRule_awardsPoints_onlyWhenVerified() {
        Beneficiary verified = Beneficiary.builder().eligibilityStatus(VerificationStatus.VERIFIED).build();
        Beneficiary pending = Beneficiary.builder().eligibilityStatus(VerificationStatus.PENDING).build();
        assertEquals(20, new DocumentsCompleteRule(config).evaluate(verified));
        assertEquals(0, new DocumentsCompleteRule(config).evaluate(pending));
    }

    // ---------------------------------------------------------------------
    // Orchestrator (EligibilityServiceImpl) tests
    // ---------------------------------------------------------------------

    @Test
    public void scoreApplication_returnsEligible_whenTotalScoreMeetsThreshold() {
        // 40 (income) + 20 (SC) + 10 (female) + 10 (senior) + 20 (verified) = 100 >= 80
        Beneficiary beneficiary = Beneficiary.builder()
                .annualIncome(BigDecimal.valueOf(120_000))
                .category(BeneficiaryCategory.SC)
                .gender(Gender.FEMALE)
                .dateOfBirth(LocalDate.now().minusYears(62))
                .eligibilityStatus(VerificationStatus.VERIFIED)
                .build();

        Application application = Application.builder()
                .id(1L)
                .applicationNumber("APP-2026-000001")
                .beneficiary(beneficiary)
                .build();

        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

        EligibilityScoringResponseDto result = eligibilityService.scoreApplication(1L);

        assertEquals(100, result.getTotalScore());
        assertEquals("ELIGIBLE", result.getEligibilityResult());
        assertEquals(5, result.getRuleBreakdown().size());
        assertEquals(EligibilityResult.ELIGIBLE, application.getEligibilityResult());
        assertEquals(100, application.getEligibilityScore());
    }

    @Test
    public void scoreApplication_returnsRejected_whenTotalScoreBelowThreshold() {
        // High income, general category, male, young, undocumented → 0 points
        Beneficiary beneficiary = Beneficiary.builder()
                .annualIncome(BigDecimal.valueOf(900_000))
                .category(BeneficiaryCategory.GENERAL)
                .gender(Gender.MALE)
                .dateOfBirth(LocalDate.now().minusYears(30))
                .eligibilityStatus(VerificationStatus.PENDING)
                .build();

        Application application = Application.builder()
                .id(2L)
                .applicationNumber("APP-2026-000002")
                .beneficiary(beneficiary)
                .build();

        when(applicationRepository.findById(2L)).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

        EligibilityScoringResponseDto result = eligibilityService.scoreApplication(2L);

        assertEquals(0, result.getTotalScore());
        assertEquals("REJECTED", result.getEligibilityResult());
        assertEquals(EligibilityResult.REJECTED, application.getEligibilityResult());
    }

    @Test
    public void scoreApplication_throwsResourceNotFound_whenApplicationMissing() {
        when(applicationRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> eligibilityService.scoreApplication(99L));

        verify(applicationRepository, never()).save(any());
    }
}