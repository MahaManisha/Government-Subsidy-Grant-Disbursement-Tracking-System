package com.gov.subsidy.service;

import com.gov.subsidy.dto.BeneficiaryDto;
import com.gov.subsidy.dto.BeneficiaryRegisterDto;

/**
 * Service interface for handling citizen self-registration logic.
 */
public interface AuthRegistrationService {

    /**
     * Registers a new citizen user account and creates their beneficiary profile.
     * Automatically assigns ROLE_BENEFICIARY.
     *
     * @param registerDto the registration payload
     * @return the created beneficiary profile details as BeneficiaryDto
     */
    BeneficiaryDto registerBeneficiary(BeneficiaryRegisterDto registerDto);
}
