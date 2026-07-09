package com.gov.subsidy.service;

import com.gov.subsidy.dto.SchemeCreateDto;
import com.gov.subsidy.dto.SchemeDto;
import com.gov.subsidy.dto.SchemeUpdateDto;

import java.util.List;

/**
 * Service interface defining all business operations for the Scheme Management module.
 *
 * <p>All validation, uniqueness checks, date-range enforcement, and entity mapping
 * are encapsulated here, keeping the controller thin and purely HTTP-focused.</p>
 */
public interface SchemeService {

    /**
     * Creates a new government scheme.
     *
     * <p>Validates that:
     * <ul>
     *   <li>The scheme {@code code} is unique.</li>
     *   <li>The scheme {@code name} is unique.</li>
     *   <li>The {@code budgetAllocation} is strictly greater than zero.</li>
     *   <li>The {@code endDate} is strictly after {@code startDate}.</li>
     *   <li>The {@code status} is a valid {@link com.gov.subsidy.enums.SchemeStatus} value.</li>
     * </ul>
     * The {@code remainingBudget} is automatically set to {@code budgetAllocation}.
     * The {@code active} flag is automatically set to {@code true}.
     * </p>
     *
     * @param createDto the request payload containing scheme details
     * @return the newly created scheme represented as a {@link SchemeDto}
     */
    SchemeDto createScheme(SchemeCreateDto createDto);

    /**
     * Retrieves all scheme records.
     *
     * @return a list of all schemes (empty list if none exist)
     */
    List<SchemeDto> getAllSchemes();

    /**
     * Retrieves a single scheme by its primary key.
     *
     * @param id the unique database ID of the scheme
     * @return the scheme represented as a {@link SchemeDto}
     * @throws com.gov.subsidy.exception.ResourceNotFoundException if no scheme exists with the given ID
     */
    SchemeDto getSchemeById(Long id);

    /**
     * Updates the mutable fields of an existing scheme.
     *
     * <p>The scheme {@code code} is immutable after creation.
     * Validates that:
     * <ul>
     *   <li>The updated {@code name} is unique (excluding the current scheme).</li>
     *   <li>The updated {@code budgetAllocation} is strictly greater than zero.</li>
     *   <li>The updated {@code endDate} is strictly after the updated {@code startDate}.</li>
     *   <li>The new {@code budgetAllocation} is not less than the already-disbursed amount
     *       (remainingBudget must stay non-negative after re-computation).</li>
     * </ul>
     * </p>
     *
     * @param id        the ID of the scheme to update
     * @param updateDto the request payload with updated values
     * @return the updated scheme represented as a {@link SchemeDto}
     * @throws com.gov.subsidy.exception.ResourceNotFoundException if no scheme exists with the given ID
     */
    SchemeDto updateScheme(Long id, SchemeUpdateDto updateDto);

    /**
     * Permanently deletes a scheme record.
     *
     * @param id the ID of the scheme to delete
     * @throws com.gov.subsidy.exception.ResourceNotFoundException if no scheme exists with the given ID
     */
    void deleteScheme(Long id);
}
