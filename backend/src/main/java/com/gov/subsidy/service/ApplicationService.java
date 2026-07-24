package com.gov.subsidy.service;

import com.gov.subsidy.dto.ApplicationCreateDto;
import com.gov.subsidy.dto.ApplicationDto;

/**
 * Service interface defining the business operations for the Application Submission module.
 *
 * <p>Handles the full lifecycle of a single submission operation:
 * <ul>
 *   <li>Validates that the referenced beneficiary exists.</li>
 *   <li>Validates that the referenced scheme exists and is active
 *       ({@code SchemeStatus.ACTIVE} and {@code active == true}).</li>
 *   <li>Guards against duplicate applications (same beneficiary + same scheme).</li>
 *   <li>Auto-generates a unique application number in the format {@code APP-YYYY-NNNNNN}.</li>
 *   <li>Initialises the workflow status to {@code SUBMITTED} and the stage to {@code INITIATION}.</li>
 * </ul>
 * </p>
 */
public interface ApplicationService {

    /**
     * Submits a new subsidy application on behalf of a beneficiary.
     *
     * <p>Validations performed (in order):
     * <ol>
     *   <li>Beneficiary with the given {@code beneficiaryId} must exist.</li>
     *   <li>Scheme with the given {@code schemeId} must exist.</li>
     *   <li>Scheme must have {@code status == ACTIVE} and {@code active == true}.</li>
     *   <li>No existing application may link the same beneficiary to the same scheme.</li>
     * </ol>
     * </p>
     *
     * @param createDto the request payload containing beneficiary ID, scheme ID,
     *                  requested amount, and priority level
     * @return the persisted application represented as an {@link ApplicationDto}
     * @throws com.gov.subsidy.exception.ResourceNotFoundException   if the beneficiary or scheme is not found
     * @throws com.gov.subsidy.exception.InactiveSchemeException     if the scheme is not active
     * @throws com.gov.subsidy.exception.DuplicateResourceException  if the beneficiary has already applied
     *                                                                for the same scheme
     */
    ApplicationDto submitApplication(ApplicationCreateDto createDto);

    /**
     * Retrieves all subsidy applications from the database.
     *
     * @return list of all applications mapped to DTOs
     */
    java.util.List<ApplicationDto> getAllApplications();
}
