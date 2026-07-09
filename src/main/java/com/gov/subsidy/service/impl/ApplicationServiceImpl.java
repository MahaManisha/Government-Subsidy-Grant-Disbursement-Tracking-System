package com.gov.subsidy.service.impl;

import com.gov.subsidy.dto.ApplicationCreateDto;
import com.gov.subsidy.dto.ApplicationDto;
import com.gov.subsidy.entity.Application;
import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.entity.Scheme;
import com.gov.subsidy.enums.ApplicationStatus;
import com.gov.subsidy.enums.PriorityLevel;
import com.gov.subsidy.enums.SchemeStatus;
import com.gov.subsidy.enums.WorkflowStage;
import com.gov.subsidy.exception.DuplicateResourceException;
import com.gov.subsidy.exception.InactiveSchemeException;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.ApplicationMapper;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.BeneficiaryRepository;
import com.gov.subsidy.repository.SchemeRepository;
import com.gov.subsidy.service.ApplicationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Year;

/**
 * Implementation of {@link ApplicationService} containing all business logic
 * for the Application Submission module.
 *
 * <p>Responsibilities:
 * <ul>
 *   <li>Beneficiary existence validation</li>
 *   <li>Scheme existence and active-status validation</li>
 *   <li>Duplicate application prevention (same beneficiary + same scheme)</li>
 *   <li>Auto-generation of application number in the format {@code APP-YYYY-NNNNNN}</li>
 *   <li>Initialisation of workflow status ({@code SUBMITTED}) and stage ({@code INITIATION})</li>
 *   <li>Persistence and DTO mapping</li>
 * </ul>
 * </p>
 */
@Service
@Transactional
public class ApplicationServiceImpl implements ApplicationService {

    private static final String APP_NUMBER_PREFIX = "APP-";

    private final ApplicationRepository applicationRepository;
    private final BeneficiaryRepository beneficiaryRepository;
    private final SchemeRepository schemeRepository;
    private final ApplicationMapper applicationMapper;

    public ApplicationServiceImpl(ApplicationRepository applicationRepository,
                                   BeneficiaryRepository beneficiaryRepository,
                                   SchemeRepository schemeRepository,
                                   ApplicationMapper applicationMapper) {
        this.applicationRepository = applicationRepository;
        this.beneficiaryRepository = beneficiaryRepository;
        this.schemeRepository = schemeRepository;
        this.applicationMapper = applicationMapper;
    }

    // =========================================================================
    // SUBMIT APPLICATION
    // =========================================================================

    @Override
    public ApplicationDto submitApplication(ApplicationCreateDto createDto) {

        // --- 1. Validate: Beneficiary exists ---
        Beneficiary beneficiary = beneficiaryRepository.findById(createDto.getBeneficiaryId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Beneficiary not found with ID: " + createDto.getBeneficiaryId()));

        // --- 2. Validate: Scheme exists ---
        Scheme scheme = schemeRepository.findById(createDto.getSchemeId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Scheme not found with ID: " + createDto.getSchemeId()));

        // --- 3. Validate: Scheme is active ---
        if (!scheme.isActive() || scheme.getStatus() != SchemeStatus.ACTIVE) {
            throw new InactiveSchemeException(
                    "Scheme '" + scheme.getName() + "' (ID: " + scheme.getId() + ") is not currently active. " +
                    "Applications can only be submitted for schemes with status ACTIVE.");
        }

        // --- 4. Validate: No duplicate application (same beneficiary + same scheme) ---
        if (applicationRepository.existsByBeneficiaryIdAndSchemeId(
                createDto.getBeneficiaryId(), createDto.getSchemeId())) {
            throw new DuplicateResourceException(
                    "Beneficiary with ID " + createDto.getBeneficiaryId() +
                    " has already submitted an application for scheme '" + scheme.getName() + "'.");
        }

        // --- 5. Parse priority enum ---
        PriorityLevel priority = parsePriorityLevel(createDto.getPriority());

        // --- 6. Generate application number: APP-YYYY-NNNNNN ---
        String applicationNumber = generateApplicationNumber();

        // --- 7. Build and persist the application entity ---
        Application application = Application.builder()
                .beneficiary(beneficiary)
                .scheme(scheme)
                .applicationNumber(applicationNumber)
                .requestedAmount(createDto.getRequestedAmount())
                .approvedAmount(null)
                .workflowStatus(ApplicationStatus.SUBMITTED)
                .currentStage(WorkflowStage.INITIATION)
                .eligibilityScore(null)
                .assignedOfficer(null)
                .submittedDate(LocalDateTime.now())
                .verifiedDate(null)
                .approvedDate(null)
                .lastModifiedDate(LocalDateTime.now())
                .remarks(null)
                .priority(priority)
                .isFlagged(false)
                .reVerificationRequested(false)
                .rejectionReason(null)
                .build();

        Application saved = applicationRepository.save(application);
        return applicationMapper.toDto(saved);
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Generates a unique application number in the format {@code APP-YYYY-NNNNNN}.
     *
     * <p>The sequential portion is derived from the count of applications already
     * registered in the current calendar year plus one. A retry loop (up to 10 attempts)
     * handles any race condition where a concurrent submission grabs the same sequence
     * slot before this one is committed.</p>
     *
     * <p>Example: {@code APP-2026-000001}, {@code APP-2026-000002}</p>
     *
     * @return a unique, formatted application number string
     */
    private String generateApplicationNumber() {
        int currentYear = Year.now().getValue();
        String yearPrefix = APP_NUMBER_PREFIX + currentYear + "-";

        // Count existing applications for the current year to derive the next sequence
        long count = applicationRepository.countByApplicationNumberStartingWith(yearPrefix);

        // Retry to handle concurrent submissions that may cause sequence collisions
        String candidate;
        int attempts = 0;
        do {
            count++;
            candidate = yearPrefix + String.format("%06d", count);
            attempts++;
            if (attempts > 10) {
                throw new IllegalStateException(
                        "Unable to generate a unique application number after 10 attempts. " +
                        "Please retry the request.");
            }
        } while (applicationRepository.existsByApplicationNumber(candidate));

        return candidate;
    }

    /**
     * Parses a raw string into the corresponding {@link PriorityLevel} enum constant.
     *
     * @param value the raw priority string from the request payload
     * @return the matched {@link PriorityLevel} constant
     * @throws IllegalArgumentException if the value is not a recognised priority level
     */
    private PriorityLevel parsePriorityLevel(String value) {
        try {
            return PriorityLevel.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalArgumentException(
                    "Invalid priority level '" + value + "'. " +
                    "Allowed values are: LOW, MEDIUM, HIGH, CRITICAL.");
        }
    }
}
