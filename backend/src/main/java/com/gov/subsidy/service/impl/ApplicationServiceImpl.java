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
import com.gov.subsidy.enums.VerificationStatus;
import com.gov.subsidy.entity.Verification;
import com.gov.subsidy.entity.VerificationHistory;
import com.gov.subsidy.entity.User;
import com.gov.subsidy.enums.RoleType;
import com.gov.subsidy.repository.UserRepository;
import com.gov.subsidy.repository.VerificationRepository;
import com.gov.subsidy.repository.VerificationHistoryRepository;
import com.gov.subsidy.enums.EligibilityResult;
import com.gov.subsidy.eligibility.EligibilityRule;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import java.util.stream.Collectors;

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
    private final UserRepository userRepository;
    private final VerificationRepository verificationRepository;
    private final VerificationHistoryRepository verificationHistoryRepository;
    private final List<EligibilityRule> rules;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public ApplicationServiceImpl(ApplicationRepository applicationRepository,
                                   BeneficiaryRepository beneficiaryRepository,
                                   SchemeRepository schemeRepository,
                                   ApplicationMapper applicationMapper,
                                   UserRepository userRepository,
                                   VerificationRepository verificationRepository,
                                   VerificationHistoryRepository verificationHistoryRepository,
                                   List<EligibilityRule> rules,
                                   org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.applicationRepository = applicationRepository;
        this.beneficiaryRepository = beneficiaryRepository;
        this.schemeRepository = schemeRepository;
        this.applicationMapper = applicationMapper;
        this.userRepository = userRepository;
        this.verificationRepository = verificationRepository;
        this.verificationHistoryRepository = verificationHistoryRepository;
        this.rules = rules;
        this.jdbcTemplate = jdbcTemplate;
    }

    @jakarta.annotation.PostConstruct
    public void initDatabaseConstraints() {
        try {
            jdbcTemplate.execute("ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_current_stage_check");
            jdbcTemplate.execute("ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_workflow_status_check");
            jdbcTemplate.execute("ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_eligibility_result_check");
        } catch (Exception e) {
            // ignore if constraints cannot be dropped or do not exist
        }
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
        PriorityLevel priority = parsePriorityLevel(createDto.getPriorityTier());

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
                .remarks(createDto.getRemarks())
                .priority(priority)
                .isFlagged(false)
                .reVerificationRequested(false)
                .rejectionReason(null)
                .build();

        // Save early to get ID
        Application saved = applicationRepository.save(application);

        try {
            // Run Rule Engine Scoring
            int totalScore = 0;
            if (rules != null) {
                for (EligibilityRule rule : rules) {
                    totalScore += rule.evaluate(beneficiary);
                }
            }
            saved.setEligibilityScore(totalScore);

            // Validate Scheme-Specific Eligibility Criteria
            List<String> failedReasons = new ArrayList<>();

            // Age limits check
            int age = 0;
            if (beneficiary.getDateOfBirth() != null) {
                age = Period.between(beneficiary.getDateOfBirth(), LocalDate.now()).getYears();
                if (scheme.getMinAge() != null && age < scheme.getMinAge()) {
                    failedReasons.add("Age " + age + " is below the minimum age of " + scheme.getMinAge() + " required for this scheme.");
                }
                if (scheme.getMaxAge() != null && age > scheme.getMaxAge()) {
                    failedReasons.add("Age " + age + " is above the maximum age of " + scheme.getMaxAge() + " required for this scheme.");
                }
            }

            // Max annual income check
            if (scheme.getMaxAnnualIncome() != null && beneficiary.getAnnualIncome() != null) {
                if (beneficiary.getAnnualIncome().compareTo(scheme.getMaxAnnualIncome()) > 0) {
                    failedReasons.add("Annual income of ₹" + beneficiary.getAnnualIncome().longValue() + " exceeds the maximum allowed limit of ₹" + scheme.getMaxAnnualIncome().longValue() + " for this scheme.");
                }
            }

            // Gender check
            if (scheme.getGender() != null && !scheme.getGender().isBlank() && !scheme.getGender().equalsIgnoreCase("ANY")) {
                String benGender = beneficiary.getGender() != null ? beneficiary.getGender().name() : "";
                if (!scheme.getGender().equalsIgnoreCase(benGender)) {
                    failedReasons.add("Gender " + benGender + " does not match the required gender " + scheme.getGender() + " for this scheme.");
                }
            }

            // Category check
            if (scheme.getCategory() != null && !scheme.getCategory().isBlank() && !scheme.getCategory().equalsIgnoreCase("ANY")) {
                String benCategory = beneficiary.getCategory() != null ? beneficiary.getCategory().name() : "";
                if (!scheme.getCategory().equalsIgnoreCase(benCategory)) {
                    failedReasons.add("Category " + benCategory + " does not match the required category " + scheme.getCategory() + " for this scheme.");
                }
            }

            // Occupation check
            if (scheme.getOccupation() != null && !scheme.getOccupation().isBlank() && !scheme.getOccupation().equalsIgnoreCase("ANY")) {
                String benOccupation = beneficiary.getOccupation() != null ? beneficiary.getOccupation() : "";
                if (!scheme.getOccupation().equalsIgnoreCase(benOccupation)) {
                    failedReasons.add("Occupation '" + benOccupation + "' does not match the required occupation '" + scheme.getOccupation() + "' for this scheme.");
                }
            }

            // State check
            if (scheme.getState() != null && !scheme.getState().isBlank() && !scheme.getState().equalsIgnoreCase("ANY")) {
                String benState = beneficiary.getState() != null ? beneficiary.getState() : "";
                if (!scheme.getState().equalsIgnoreCase(benState)) {
                    failedReasons.add("State " + benState + " does not match the required state " + scheme.getState() + " for this scheme.");
                }
            }

            // District check
            if (scheme.getDistrict() != null && !scheme.getDistrict().isBlank() && !scheme.getDistrict().equalsIgnoreCase("ANY")) {
                String benDistrict = beneficiary.getDistrict() != null ? beneficiary.getDistrict() : "";
                if (!scheme.getDistrict().equalsIgnoreCase(benDistrict)) {
                    failedReasons.add("District " + benDistrict + " does not match the required district " + scheme.getDistrict() + " for this scheme.");
                }
            }

            // Max grant amount check
            if (scheme.getMaxGrantAmount() != null && saved.getRequestedAmount() != null) {
                if (saved.getRequestedAmount().compareTo(scheme.getMaxGrantAmount()) > 0) {
                    failedReasons.add("Requested amount ₹" + saved.getRequestedAmount().longValue() + " exceeds the maximum allowed grant of ₹" + scheme.getMaxGrantAmount().longValue() + " for this scheme.");
                }
            }

            // Required documents check
            if (scheme.getRequiredDocuments() != null && !scheme.getRequiredDocuments().isBlank()) {
                if (beneficiary.getEligibilityStatus() != VerificationStatus.VERIFIED) {
                    failedReasons.add("Required documents [" + scheme.getRequiredDocuments() + "] are not fully verified (profile status: " + beneficiary.getEligibilityStatus() + ").");
                }
            }

            if (failedReasons.isEmpty()) {
                saved.setEligibilityResult(EligibilityResult.ELIGIBLE);
                saved.setWorkflowStatus(ApplicationStatus.ELIGIBILITY_VERIFIED);
                saved.setCurrentStage(WorkflowStage.FIELD_VERIFICATION_PENDING);

                // Auto-assign to least loaded field officer
                List<User> officers = userRepository.findLeastLoadedActiveUsersByRole(RoleType.ROLE_FIELD_OFFICER);
                if (!officers.isEmpty()) {
                    User officer = officers.get(0);
                    saved.setAssignedOfficer(officer);

                    Verification verification = Verification.builder()
                            .application(saved)
                            .fieldOfficer(officer)
                            .status(VerificationStatus.PENDING)
                            .remarks("Auto-routed to least loaded Field Officer.")
                            .build();
                    Verification savedVerification = verificationRepository.save(verification);

                    VerificationHistory history = VerificationHistory.builder()
                            .verification(savedVerification)
                            .officer(officer)
                            .status(VerificationStatus.PENDING)
                            .remarks("Verification workflow initiated. Assigned to " + officer.getUsername())
                            .actionDate(LocalDateTime.now())
                            .build();
                    verificationHistoryRepository.save(history);
                }
            } else {
                saved.setEligibilityResult(EligibilityResult.NOT_ELIGIBLE);
                saved.setWorkflowStatus(ApplicationStatus.ELIGIBILITY_REJECTED);
                saved.setRejectionReason(String.join("; ", failedReasons));
            }

            saved.setLastModifiedDate(LocalDateTime.now());
            Application finalSaved = applicationRepository.save(saved);
            return applicationMapper.toDto(finalSaved);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Eligibility evaluation failed: " + ex.getMessage(), ex);
        }
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

    @Override
    @Transactional(readOnly = true)
    public java.util.List<ApplicationDto> getAllApplications() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return applicationRepository.findAll().stream()
                    .map(applicationMapper::toDto)
                    .collect(Collectors.toList());
        }

        String username = auth.getName();
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return applicationRepository.findAll().stream()
                    .map(applicationMapper::toDto)
                    .collect(Collectors.toList());
        }

        boolean isAdmin = user.getRoles().stream().anyMatch(r -> r.getName() == RoleType.ROLE_ADMIN);
        if (isAdmin) {
            return applicationRepository.findAll().stream()
                    .map(applicationMapper::toDto)
                    .collect(Collectors.toList());
        }

        boolean isFieldOfficer = user.getRoles().stream().anyMatch(r -> r.getName() == RoleType.ROLE_FIELD_OFFICER);
        boolean isDistrictOfficer = user.getRoles().stream().anyMatch(r -> r.getName() == RoleType.ROLE_DISTRICT_OFFICER);
        boolean isFinanceOfficer = user.getRoles().stream().anyMatch(r -> r.getName() == RoleType.ROLE_FINANCE_OFFICER);
        boolean isBeneficiary = user.getRoles().stream().anyMatch(r -> r.getName() == RoleType.ROLE_BENEFICIARY);

        List<Application> list = applicationRepository.findAll();

        return list.stream()
                .filter(a -> {
                    if (isFieldOfficer) {
                        return a.getCurrentStage() == WorkflowStage.FIELD_VERIFICATION_PENDING 
                                || a.getCurrentStage() == WorkflowStage.FIELD_VERIFICATION;
                    }
                    if (isDistrictOfficer) {
                        return a.getCurrentStage() == WorkflowStage.DISTRICT_REVIEW_PENDING 
                                || a.getCurrentStage() == WorkflowStage.DISTRICT_REVIEW;
                    }
                    if (isFinanceOfficer) {
                        return a.getCurrentStage() == WorkflowStage.FINANCE_REVIEW_PENDING 
                                || a.getCurrentStage() == WorkflowStage.FINANCE_REVIEW;
                    }
                    if (isBeneficiary) {
                        return a.getBeneficiary() != null && a.getBeneficiary().getUser() != null 
                                && a.getBeneficiary().getUser().getUsername().equals(username);
                    }
                    return false;
                })
                .map(applicationMapper::toDto)
                .collect(Collectors.toList());
    }
}
