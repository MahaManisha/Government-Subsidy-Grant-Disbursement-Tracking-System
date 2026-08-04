package com.gov.subsidy.service.impl;

import com.gov.subsidy.dto.SchemeCreateDto;
import com.gov.subsidy.dto.SchemeDto;
import com.gov.subsidy.dto.SchemeUpdateDto;
import com.gov.subsidy.entity.Application;
import com.gov.subsidy.entity.ApplicationDocument;
import com.gov.subsidy.entity.DisbursementPlan;
import com.gov.subsidy.entity.Scheme;
import com.gov.subsidy.entity.Verification;
import com.gov.subsidy.enums.SchemeStatus;
import com.gov.subsidy.exception.DuplicateResourceException;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.exception.SchemeInUseException;
import com.gov.subsidy.mapper.SchemeMapper;
import com.gov.subsidy.repository.ApplicationDocumentRepository;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.ComplianceRepository;
import com.gov.subsidy.repository.DisbursementMilestoneRepository;
import com.gov.subsidy.repository.DisbursementPlanRepository;
import com.gov.subsidy.repository.DisbursementRepository;
import com.gov.subsidy.repository.FundUtilizationRepository;
import com.gov.subsidy.repository.RoutingRecordRepository;
import com.gov.subsidy.repository.SchemeRepository;
import com.gov.subsidy.repository.VerificationHistoryRepository;
import com.gov.subsidy.repository.VerificationRepository;
import com.gov.subsidy.repository.WorkflowAuditLogRepository;
import com.gov.subsidy.service.SchemeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Implementation of {@link SchemeService} containing all business logic
 * for Scheme Management CRUD operations.
 *
 * <p>Responsibilities:
 * <ul>
 *   <li>Code and name uniqueness enforcement</li>
 *   <li>Budget positivity and remaining-budget consistency</li>
 *   <li>Date-range validation (endDate &gt; startDate)</li>
 *   <li>Enum value parsing with descriptive error messages</li>
 *   <li>Active/Inactive toggle management</li>
 * </ul>
 * </p>
 */
@Service
@Transactional
public class SchemeServiceImpl implements SchemeService {

    private static final Logger log = LoggerFactory.getLogger(SchemeServiceImpl.class);

    private final SchemeRepository schemeRepository;
    private final SchemeMapper schemeMapper;
    private final ApplicationRepository applicationRepository;
    private final ApplicationDocumentRepository applicationDocumentRepository;
    private final VerificationRepository verificationRepository;
    private final VerificationHistoryRepository verificationHistoryRepository;
    private final WorkflowAuditLogRepository workflowAuditLogRepository;
    private final DisbursementPlanRepository disbursementPlanRepository;
    private final DisbursementMilestoneRepository disbursementMilestoneRepository;
    private final DisbursementRepository disbursementRepository;
    private final ComplianceRepository complianceRepository;
    private final FundUtilizationRepository fundUtilizationRepository;
    private final RoutingRecordRepository routingRecordRepository;

    public SchemeServiceImpl(SchemeRepository schemeRepository,
                             SchemeMapper schemeMapper,
                             ApplicationRepository applicationRepository,
                             ApplicationDocumentRepository applicationDocumentRepository,
                             VerificationRepository verificationRepository,
                             VerificationHistoryRepository verificationHistoryRepository,
                             WorkflowAuditLogRepository workflowAuditLogRepository,
                             DisbursementPlanRepository disbursementPlanRepository,
                             DisbursementMilestoneRepository disbursementMilestoneRepository,
                             DisbursementRepository disbursementRepository,
                             ComplianceRepository complianceRepository,
                             FundUtilizationRepository fundUtilizationRepository,
                             RoutingRecordRepository routingRecordRepository) {
        this.schemeRepository = schemeRepository;
        this.schemeMapper = schemeMapper;
        this.applicationRepository = applicationRepository;
        this.applicationDocumentRepository = applicationDocumentRepository;
        this.verificationRepository = verificationRepository;
        this.verificationHistoryRepository = verificationHistoryRepository;
        this.workflowAuditLogRepository = workflowAuditLogRepository;
        this.disbursementPlanRepository = disbursementPlanRepository;
        this.disbursementMilestoneRepository = disbursementMilestoneRepository;
        this.disbursementRepository = disbursementRepository;
        this.complianceRepository = complianceRepository;
        this.fundUtilizationRepository = fundUtilizationRepository;
        this.routingRecordRepository = routingRecordRepository;
    }

    // =========================================================================
    // CREATE
    // =========================================================================

    @Override
    public SchemeDto createScheme(SchemeCreateDto createDto) {

        // --- Uniqueness: Scheme code ---
        if (schemeRepository.existsByCode(createDto.getCode())) {
            throw new DuplicateResourceException(
                    "A scheme with code '" + createDto.getCode() + "' already exists.");
        }

        // --- Uniqueness: Scheme name ---
        if (schemeRepository.existsByName(createDto.getName())) {
            throw new DuplicateResourceException(
                    "A scheme with name '" + createDto.getName() + "' already exists.");
        }

        // --- Date range: endDate must be after startDate ---
        if (createDto.getStartDate() != null && createDto.getEndDate() != null
                && !createDto.getEndDate().isAfter(createDto.getStartDate())) {
            throw new IllegalArgumentException(
                    "End date (" + createDto.getEndDate() + ") must be strictly after start date ("
                            + createDto.getStartDate() + ").");
        }

        // --- Enum parsing: status ---
        SchemeStatus status = parseSchemeStatus(createDto.getStatus());

        // --- Build entity (remainingBudget = budgetAllocation on creation; active = true) ---
        Scheme scheme = Scheme.builder()
                .name(createDto.getName().trim())
                .code(createDto.getCode().trim().toUpperCase())
                .description(createDto.getDescription().trim())
                .budgetAllocation(createDto.getBudgetAllocation())
                .remainingBudget(createDto.getBudgetAllocation())
                .startDate(createDto.getStartDate())
                .endDate(createDto.getEndDate())
                .active(true)
                .status(status)
                .minAge(createDto.getMinAge())
                .maxAge(createDto.getMaxAge())
                .maxAnnualIncome(createDto.getMaxAnnualIncome())
                .gender(createDto.getGender())
                .category(createDto.getCategory())
                .occupation(createDto.getOccupation())
                .state(createDto.getState())
                .district(createDto.getDistrict())
                .requiredDocuments(createDto.getRequiredDocuments())
                .maxGrantAmount(createDto.getMaxGrantAmount())
                .build();

        Scheme saved = schemeRepository.save(scheme);
        return schemeMapper.toDto(saved);
    }

    // =========================================================================
    // READ ALL
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<SchemeDto> getAllSchemes() {
        return schemeRepository.findAll()
                .stream()
                .map(schemeMapper::toDto)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // READ BY ID
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public SchemeDto getSchemeById(Long id) {
        Scheme scheme = schemeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Scheme not found with ID: " + id));
        return schemeMapper.toDto(scheme);
    }

    // =========================================================================
    // UPDATE
    // =========================================================================

    @Override
    public SchemeDto updateScheme(Long id, SchemeUpdateDto updateDto) {

        // --- Existence check ---
        Scheme existing = schemeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Scheme not found with ID: " + id));

        // --- Uniqueness: Scheme name (excluding self) ---
        if (schemeRepository.existsByNameAndIdNot(updateDto.getName(), id)) {
            throw new DuplicateResourceException(
                    "A scheme with name '" + updateDto.getName() + "' already exists.");
        }

        // --- Date range: endDate must be after startDate ---
        if (updateDto.getStartDate() != null && updateDto.getEndDate() != null
                && !updateDto.getEndDate().isAfter(updateDto.getStartDate())) {
            throw new IllegalArgumentException(
                    "End date (" + updateDto.getEndDate() + ") must be strictly after start date ("
                            + updateDto.getStartDate() + ").");
        }

        // --- Budget consistency: new allocation must not be less than already disbursed amount ---
        BigDecimal disbursedAmount = existing.getBudgetAllocation()
                .subtract(existing.getRemainingBudget());
        if (updateDto.getBudgetAllocation().compareTo(disbursedAmount) < 0) {
            throw new IllegalArgumentException(
                    "New budget allocation (" + updateDto.getBudgetAllocation() + ") cannot be less than "
                            + "the amount already disbursed (" + disbursedAmount + ").");
        }

        // --- Recalculate remaining budget ---
        BigDecimal newRemaining = updateDto.getBudgetAllocation().subtract(disbursedAmount);

        // --- Enum parsing: status ---
        SchemeStatus status = parseSchemeStatus(updateDto.getStatus());

        // --- Apply changes (code is intentionally never updated) ---
        existing.setName(updateDto.getName().trim());
        existing.setDescription(updateDto.getDescription().trim());
        existing.setBudgetAllocation(updateDto.getBudgetAllocation());
        existing.setRemainingBudget(newRemaining);
        existing.setStartDate(updateDto.getStartDate());
        existing.setEndDate(updateDto.getEndDate());
        existing.setActive(updateDto.getActive());
        existing.setStatus(status);
        existing.setMinAge(updateDto.getMinAge());
        existing.setMaxAge(updateDto.getMaxAge());
        existing.setMaxAnnualIncome(updateDto.getMaxAnnualIncome());
        existing.setGender(updateDto.getGender());
        existing.setCategory(updateDto.getCategory());
        existing.setOccupation(updateDto.getOccupation());
        existing.setState(updateDto.getState());
        existing.setDistrict(updateDto.getDistrict());
        existing.setRequiredDocuments(updateDto.getRequiredDocuments());
        existing.setMaxGrantAmount(updateDto.getMaxGrantAmount());

        Scheme updated = schemeRepository.save(existing);
        return schemeMapper.toDto(updated);
    }

    // =========================================================================
    // DELETE & DEACTIVATE
    // =========================================================================

    @Override
    public void deleteScheme(Long id) {
        Scheme scheme = schemeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Scheme not found with ID: " + id));

        boolean inUse = applicationRepository.existsBySchemeId(id);
        if (inUse) {
            throw new SchemeInUseException(
                    "Cannot delete this scheme because it is associated with existing beneficiary applications. Deactivate the scheme instead.");
        }

        schemeRepository.delete(scheme);
    }

    @Override
    public SchemeDto deactivateScheme(Long id) {
        Scheme scheme = schemeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Scheme not found with ID: " + id));

        scheme.setActive(false);
        scheme.setStatus(SchemeStatus.INACTIVE);

        Scheme saved = schemeRepository.save(scheme);
        return schemeMapper.toDto(saved);
    }

    @Override
    @Transactional
    public void forceDeleteScheme(Long id) {
        Scheme scheme = schemeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Scheme not found with ID: " + id));

        List<Application> applications = applicationRepository.findBySchemeId(id);
        log.info("[forceDeleteScheme] Initiating force delete for Scheme ID: {} [{}] with {} application(s)",
                id, scheme.getName(), applications.size());

        for (Application app : applications) {
            Long appId = app.getId();

            // 1. Delete Verifications & Verification History
            Optional<Verification> verificationOpt = verificationRepository.findByApplicationId(appId);
            if (verificationOpt.isPresent()) {
                Verification v = verificationOpt.get();
                verificationHistoryRepository.deleteAll(
                        verificationHistoryRepository.findByVerificationIdOrderByActionDateAsc(v.getId()));
                verificationRepository.delete(v);
            }

            // 2. Delete Workflow Audit Logs
            workflowAuditLogRepository.deleteAll(
                    workflowAuditLogRepository.findByApplicationIdOrderByOccurredAtAsc(appId));

            // 3. Delete Application Documents (and physical files if present)
            List<ApplicationDocument> docs = applicationDocumentRepository.findByApplicationId(appId);
            for (ApplicationDocument doc : docs) {
                if (doc.getStoragePath() != null && !doc.getStoragePath().isBlank()) {
                    try {
                        java.nio.file.Files.deleteIfExists(java.nio.file.Paths.get(doc.getStoragePath()));
                    } catch (Exception e) {
                        log.warn("Failed to delete physical file: {}", doc.getStoragePath());
                    }
                }
            }
            applicationDocumentRepository.deleteAll(docs);

            // 4. Delete Disbursement Plan & Milestones
            Optional<DisbursementPlan> planOpt = disbursementPlanRepository.findByApplicationId(appId);
            if (planOpt.isPresent()) {
                DisbursementPlan plan = planOpt.get();
                disbursementMilestoneRepository.deleteAll(
                        disbursementMilestoneRepository.findByDisbursementPlanIdOrderByMilestoneNumberAsc(plan.getId()));
                disbursementPlanRepository.delete(plan);
            }

            // 5. Delete Disbursements
            disbursementRepository.deleteAll(
                    disbursementRepository.findByApplicationId(appId));

            // 6. Delete Compliance
            complianceRepository.deleteAll(
                    complianceRepository.findByApplicationId(appId));

            // 7. Delete Fund Utilization
            fundUtilizationRepository.deleteAll(
                    fundUtilizationRepository.findByApplicationId(appId));

            // 8. Delete Routing Records
            routingRecordRepository.deleteAll(
                    routingRecordRepository.findByApplicationIdOrderByRoutedAtAsc(appId));

            // 9. Delete Application
            applicationRepository.delete(app);
        }

        // Finally delete the Scheme
        schemeRepository.delete(scheme);
        log.info("[forceDeleteScheme] Scheme ID: {} and all associated child records permanently deleted", id);
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Parses a raw string into a {@link SchemeStatus} enum constant.
     *
     * @param value raw status string from the request payload
     * @return the corresponding {@link SchemeStatus} constant
     * @throws IllegalArgumentException if the value is not a recognised status
     */
    private SchemeStatus parseSchemeStatus(String value) {
        try {
            return SchemeStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalArgumentException(
                    "Invalid scheme status '" + value + "'. " +
                            "Allowed values are: ACTIVE, INACTIVE, DRAFT, ARCHIVED.");
        }
    }
}
