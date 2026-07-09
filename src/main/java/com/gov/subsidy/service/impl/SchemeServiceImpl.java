package com.gov.subsidy.service.impl;

import com.gov.subsidy.dto.SchemeCreateDto;
import com.gov.subsidy.dto.SchemeDto;
import com.gov.subsidy.dto.SchemeUpdateDto;
import com.gov.subsidy.entity.Scheme;
import com.gov.subsidy.enums.SchemeStatus;
import com.gov.subsidy.exception.DuplicateResourceException;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.SchemeMapper;
import com.gov.subsidy.repository.SchemeRepository;
import com.gov.subsidy.service.SchemeService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
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

    private final SchemeRepository schemeRepository;
    private final SchemeMapper schemeMapper;

    public SchemeServiceImpl(SchemeRepository schemeRepository, SchemeMapper schemeMapper) {
        this.schemeRepository = schemeRepository;
        this.schemeMapper = schemeMapper;
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

        Scheme updated = schemeRepository.save(existing);
        return schemeMapper.toDto(updated);
    }

    // =========================================================================
    // DELETE
    // =========================================================================

    @Override
    public void deleteScheme(Long id) {
        if (!schemeRepository.existsById(id)) {
            throw new ResourceNotFoundException("Scheme not found with ID: " + id);
        }
        schemeRepository.deleteById(id);
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
