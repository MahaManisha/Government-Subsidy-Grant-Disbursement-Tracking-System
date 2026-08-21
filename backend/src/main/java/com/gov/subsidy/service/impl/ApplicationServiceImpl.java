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
import com.gov.subsidy.entity.ApplicationDocument;
import com.gov.subsidy.repository.ApplicationDocumentRepository;
import com.gov.subsidy.service.RoutingService;
import com.gov.subsidy.entity.WorkflowAuditLog;
import com.gov.subsidy.repository.WorkflowAuditLogRepository;
import com.gov.subsidy.enums.WorkflowEvent;

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
    private final ApplicationDocumentRepository documentRepository;
    private final List<EligibilityRule> rules;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    private final @org.springframework.context.annotation.Lazy RoutingService routingService;
    private final WorkflowAuditLogRepository auditLogRepository;

    public ApplicationServiceImpl(ApplicationRepository applicationRepository,
                                   BeneficiaryRepository beneficiaryRepository,
                                   SchemeRepository schemeRepository,
                                   ApplicationMapper applicationMapper,
                                   UserRepository userRepository,
                                   VerificationRepository verificationRepository,
                                   VerificationHistoryRepository verificationHistoryRepository,
                                   ApplicationDocumentRepository documentRepository,
                                   List<EligibilityRule> rules,
                                   org.springframework.jdbc.core.JdbcTemplate jdbcTemplate,
                                   @org.springframework.context.annotation.Lazy RoutingService routingService,
                                   WorkflowAuditLogRepository auditLogRepository) {
        this.applicationRepository = applicationRepository;
        this.beneficiaryRepository = beneficiaryRepository;
        this.schemeRepository = schemeRepository;
        this.applicationMapper = applicationMapper;
        this.userRepository = userRepository;
        this.verificationRepository = verificationRepository;
        this.verificationHistoryRepository = verificationHistoryRepository;
        this.documentRepository = documentRepository;
        this.rules = rules;
        this.jdbcTemplate = jdbcTemplate;
        this.routingService = routingService;
        this.auditLogRepository = auditLogRepository;
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

        // Persist uploaded documents linked to this application
        if (createDto.getDocuments() != null && !createDto.getDocuments().isEmpty()) {
            for (com.gov.subsidy.dto.ApplicationDocumentUploadDto docDto : createDto.getDocuments()) {
                if (docDto.getDocumentType() != null && !docDto.getDocumentType().isBlank()) {
                    ApplicationDocument appDoc = ApplicationDocument.builder()
                            .application(saved)
                            .beneficiary(beneficiary)
                            .scheme(scheme)
                            .documentType(docDto.getDocumentType().trim())
                            .originalFileName(docDto.getOriginalFileName() != null ? docDto.getOriginalFileName() : docDto.getDocumentType() + ".pdf")
                            .storagePath(docDto.getStoragePath() != null ? docDto.getStoragePath() : "uploads/documents/" + docDto.getDocumentType().replaceAll("\\s+", "_") + ".pdf")
                            .fileSize(docDto.getFileSize() != null ? docDto.getFileSize() : 1024L)
                            .contentType(docDto.getContentType() != null ? docDto.getContentType() : "application/pdf")
                            .uploadTimestamp(LocalDateTime.now())
                            .build();
                    documentRepository.save(appDoc);
                }
            }
        }

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
            List<String> passedRules = new ArrayList<>();
            List<String> failedRules = new ArrayList<>();
            List<String> failedReasons = new ArrayList<>();

            // 1. Age limits check
            int age = 0;
            if (beneficiary.getDateOfBirth() != null) {
                age = Period.between(beneficiary.getDateOfBirth(), LocalDate.now()).getYears();
                boolean agePass = true;
                if (scheme.getMinAge() != null && age < scheme.getMinAge()) {
                    failedReasons.add("Age " + age + " is below minimum required age of " + scheme.getMinAge());
                    agePass = false;
                }
                if (scheme.getMaxAge() != null && age > scheme.getMaxAge()) {
                    failedReasons.add("Age " + age + " is above maximum allowed age of " + scheme.getMaxAge());
                    agePass = false;
                }
                if (agePass) {
                    passedRules.add("Age Qualification (" + age + " yrs)");
                } else {
                    failedRules.add("Age Limit Compliance");
                }
            } else {
                passedRules.add("Age Qualification (Verified)");
            }

            // 2. Max annual income check
            if (scheme.getMaxAnnualIncome() != null && beneficiary.getAnnualIncome() != null) {
                if (beneficiary.getAnnualIncome().compareTo(scheme.getMaxAnnualIncome()) > 0) {
                    failedReasons.add("Annual income of ₹" + beneficiary.getAnnualIncome().longValue() + " exceeds maximum allowed limit of ₹" + scheme.getMaxAnnualIncome().longValue());
                    failedRules.add("Income Limit Threshold");
                } else {
                    passedRules.add("Annual Income Compliance (₹" + beneficiary.getAnnualIncome().longValue() + ")");
                }
            } else {
                passedRules.add("Annual Income Compliance");
            }

            // 3. Gender check
            if (scheme.getGender() != null && !scheme.getGender().isBlank() && !scheme.getGender().equalsIgnoreCase("ANY")) {
                String benGender = beneficiary.getGender() != null ? beneficiary.getGender().name() : "";
                if (!scheme.getGender().equalsIgnoreCase(benGender)) {
                    failedReasons.add("Gender " + benGender + " does not match required gender " + scheme.getGender());
                    failedRules.add("Gender Match");
                } else {
                    passedRules.add("Gender Match (" + benGender + ")");
                }
            } else {
                passedRules.add("Gender Match (All)");
            }

            // 4. Category check
            if (scheme.getCategory() != null && !scheme.getCategory().isBlank() && !scheme.getCategory().equalsIgnoreCase("ANY")) {
                String benCategory = beneficiary.getCategory() != null ? beneficiary.getCategory().name() : "";
                if (!scheme.getCategory().equalsIgnoreCase(benCategory)) {
                    failedReasons.add("Category " + benCategory + " does not match required category " + scheme.getCategory());
                    failedRules.add("Category Match");
                } else {
                    passedRules.add("Category Match (" + benCategory + ")");
                }
            } else {
                passedRules.add("Category Match (All)");
            }

            // 5. Occupation check
            if (scheme.getOccupation() != null && !scheme.getOccupation().isBlank() && !scheme.getOccupation().equalsIgnoreCase("ANY")) {
                String benOccupation = beneficiary.getOccupation() != null ? beneficiary.getOccupation() : "";
                if (!scheme.getOccupation().equalsIgnoreCase(benOccupation)) {
                    failedReasons.add("Occupation '" + benOccupation + "' does not match required occupation '" + scheme.getOccupation() + "'");
                    failedRules.add("Occupation Match");
                } else {
                    passedRules.add("Occupation Match (" + benOccupation + ")");
                }
            } else {
                passedRules.add("Occupation Match (All)");
            }

            // 6. Geographic check
            if ((scheme.getState() != null && !scheme.getState().isBlank() && !scheme.getState().equalsIgnoreCase("ANY")) ||
                (scheme.getDistrict() != null && !scheme.getDistrict().isBlank() && !scheme.getDistrict().equalsIgnoreCase("ANY"))) {
                String benState = beneficiary.getState() != null ? beneficiary.getState() : "";
                String benDistrict = beneficiary.getDistrict() != null ? beneficiary.getDistrict() : "";
                boolean geoPass = true;
                if (scheme.getState() != null && !scheme.getState().isBlank() && !scheme.getState().equalsIgnoreCase("ANY") && !scheme.getState().replaceAll("\\s+", "").equalsIgnoreCase(benState.replaceAll("\\s+", ""))) {
                    failedReasons.add("State " + benState + " does not match required state " + scheme.getState());
                    geoPass = false;
                }
                if (scheme.getDistrict() != null && !scheme.getDistrict().isBlank() && !scheme.getDistrict().equalsIgnoreCase("ANY") && !scheme.getDistrict().replaceAll("\\s+", "").equalsIgnoreCase(benDistrict.replaceAll("\\s+", ""))) {
                    failedReasons.add("District " + benDistrict + " does not match required district " + scheme.getDistrict());
                    geoPass = false;
                }
                if (geoPass) {
                    passedRules.add("Geographic District & State Limits (" + benDistrict + ", " + benState + ")");
                } else {
                    failedRules.add("Geographic Location Eligibility");
                }
            } else {
                passedRules.add("Geographic Location Eligibility");
            }

            // 7. Max grant amount check
            if (scheme.getMaxGrantAmount() != null && saved.getRequestedAmount() != null) {
                if (saved.getRequestedAmount().compareTo(scheme.getMaxGrantAmount()) > 0) {
                    failedReasons.add("Requested amount ₹" + saved.getRequestedAmount().longValue() + " exceeds maximum allowed grant ₹" + scheme.getMaxGrantAmount().longValue());
                    failedRules.add("Max Grant Amount Cap");
                } else {
                    passedRules.add("Requested Subsidy Amount (₹" + saved.getRequestedAmount().longValue() + ")");
                }
            } else {
                passedRules.add("Requested Subsidy Amount");
            }

            // 8. Required documents check
            if (scheme.getRequiredDocuments() != null && !scheme.getRequiredDocuments().isBlank()) {
                List<String> requiredDocTypes = java.util.Arrays.stream(scheme.getRequiredDocuments().split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList());

                List<ApplicationDocument> savedDocs = documentRepository.findByApplicationId(saved.getId());
                java.util.Set<String> uploadedTypes = savedDocs.stream()
                        .map(ApplicationDocument::getDocumentType)
                        .map(String::trim)
                        .map(String::toLowerCase)
                        .collect(Collectors.toSet());

                List<String> missingDocs = new ArrayList<>();
                for (String reqDoc : requiredDocTypes) {
                    if (!uploadedTypes.contains(reqDoc.toLowerCase())) {
                        missingDocs.add(reqDoc);
                    }
                }

                if (!missingDocs.isEmpty()) {
                    failedReasons.add("Missing Required Documents: " + String.join(", ", missingDocs));
                    failedRules.add("Document Completeness (" + (requiredDocTypes.size() - missingDocs.size()) + "/" + requiredDocTypes.size() + " uploaded)");
                } else {
                    passedRules.add("Required Document Completeness (" + requiredDocTypes.size() + "/" + requiredDocTypes.size() + " uploaded)");
                }
            } else {
                passedRules.add("Required Document Completeness");
            }

            if (failedReasons.isEmpty()) {
                saved.setEligibilityResult(EligibilityResult.ELIGIBLE);
                saved.setWorkflowStatus(ApplicationStatus.SUBMITTED);
                saved.setCurrentStage(WorkflowStage.INITIATION);

                saved.setLastModifiedDate(LocalDateTime.now());
                Application finalSaved = applicationRepository.save(saved);
                
                // Route application through the standard engine
                routingService.routeApplication(finalSaved.getId());

                return applicationMapper.toDto(finalSaved);
            } else {
                saved.setEligibilityResult(EligibilityResult.NOT_ELIGIBLE);
                saved.setWorkflowStatus(ApplicationStatus.ELIGIBILITY_REJECTED);
                saved.setCurrentStage(WorkflowStage.INITIATION);
                saved.setAssignedOfficer(null);
                String reasonStr = String.join("; ", failedReasons);
                if (reasonStr.length() > 250) {
                    reasonStr = reasonStr.substring(0, 250);
                }
                saved.setRejectionReason(reasonStr);
                saved.setLastModifiedDate(LocalDateTime.now());
                Application finalSaved = applicationRepository.save(saved);

                // Save an audit log for auto-rejection
                WorkflowAuditLog log = WorkflowAuditLog.builder()
                        .application(finalSaved)
                        .event(WorkflowEvent.AUTO_ELIGIBILITY_REJECTION)
                        .fromStatus(ApplicationStatus.SUBMITTED)
                        .toStatus(ApplicationStatus.ELIGIBILITY_REJECTED)
                        .fromStage(WorkflowStage.INITIATION)
                        .toStage(WorkflowStage.INITIATION)
                        .actor("SYSTEM")
                        .description("Automated eligibility check failed: " + reasonStr)
                        .automated(true)
                        .occurredAt(LocalDateTime.now())
                        .build();
                auditLogRepository.save(log);

                return applicationMapper.toDto(finalSaved);
            }


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
                        return (a.getCurrentStage() == WorkflowStage.FIELD_VERIFICATION_PENDING 
                                || a.getCurrentStage() == WorkflowStage.FIELD_VERIFICATION)
                                || (a.getAssignedOfficer() != null && a.getAssignedOfficer().getId().equals(user.getId()));
                    }
                    if (isDistrictOfficer) {
                        return (a.getCurrentStage() == WorkflowStage.DISTRICT_REVIEW_PENDING 
                                || a.getCurrentStage() == WorkflowStage.DISTRICT_REVIEW)
                                || (a.getAssignedOfficer() != null && a.getAssignedOfficer().getId().equals(user.getId()));
                    }
                    if (isFinanceOfficer) {
                        return a.getCurrentStage() == WorkflowStage.FINANCE_REVIEW_PENDING 
                                || a.getCurrentStage() == WorkflowStage.FINANCE_REVIEW
                                || a.getCurrentStage() == WorkflowStage.COMPLETED
                                || a.getWorkflowStatus() == ApplicationStatus.DISTRICT_APPROVED
                                || a.getWorkflowStatus() == ApplicationStatus.FINANCE_APPROVED
                                || a.getWorkflowStatus() == ApplicationStatus.FINANCE_REJECTED
                                || a.getWorkflowStatus() == ApplicationStatus.DISBURSED
                                || a.getWorkflowStatus() == ApplicationStatus.READY_FOR_DISBURSEMENT
                                || (a.getAssignedOfficer() != null && a.getAssignedOfficer().getId().equals(user.getId()));
                    }
                    if (isBeneficiary) {
                        if (a.getBeneficiary() == null) return false;
                        if (a.getBeneficiary().getUser() != null && username.equals(a.getBeneficiary().getUser().getUsername())) {
                            return true;
                        }
                        return user != null && a.getBeneficiary().getUser() != null && user.getId().equals(a.getBeneficiary().getUser().getId());
                    }
                    return false;
                })
                .map(applicationMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ApplicationDto> getMyApplications() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return new ArrayList<>();
        }
        String username = auth.getName();
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return new ArrayList<>();
        }
        Beneficiary ben = beneficiaryRepository.findByUserId(user.getId()).orElse(null);
        if (ben != null) {
            List<Application> apps = applicationRepository.findByBeneficiaryId(ben.getId());
            return apps.stream().map(applicationMapper::toDto).collect(Collectors.toList());
        }
        List<Application> all = applicationRepository.findAll();
        return all.stream()
                .filter(a -> a.getBeneficiary() != null && a.getBeneficiary().getUser() != null 
                        && (username.equals(a.getBeneficiary().getUser().getUsername()) || user.getId().equals(a.getBeneficiary().getUser().getId())))
                .map(applicationMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public ApplicationDto getApplicationById(Long id) {
        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with ID: " + id));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            String username = auth.getName();
            boolean isFieldOfficer = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_FIELD_OFFICER"));
            if (isFieldOfficer) {
                if (app.getAssignedOfficer() == null || !app.getAssignedOfficer().getUsername().equals(username)) {
                    throw new org.springframework.security.access.AccessDeniedException("Unauthorized: Application is not assigned to you.");
                }
            }
        }
        return applicationMapper.toDto(app);
    }
}
