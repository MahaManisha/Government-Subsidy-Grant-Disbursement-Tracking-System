package com.gov.subsidy.service.impl;

import com.gov.subsidy.dto.BeneficiaryCreateDto;
import com.gov.subsidy.dto.BeneficiaryDto;
import com.gov.subsidy.dto.BeneficiaryUpdateDto;
import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.entity.User;
import com.gov.subsidy.enums.BeneficiaryCategory;
import com.gov.subsidy.enums.Gender;
import com.gov.subsidy.enums.VerificationStatus;
import com.gov.subsidy.exception.DuplicateResourceException;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.BeneficiaryMapper;
import com.gov.subsidy.repository.BeneficiaryRepository;
import com.gov.subsidy.repository.UserRepository;
import com.gov.subsidy.service.BeneficiaryService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implementation of {@link BeneficiaryService} containing all business logic
 * for beneficiary CRUD operations, including validation, uniqueness checks,
 * and proper mapping between DTOs and entities.
 */
@Service
@Transactional
public class BeneficiaryServiceImpl implements BeneficiaryService {

    private final BeneficiaryRepository beneficiaryRepository;
    private final UserRepository userRepository;
    private final BeneficiaryMapper beneficiaryMapper;

    public BeneficiaryServiceImpl(BeneficiaryRepository beneficiaryRepository,
                                   UserRepository userRepository,
                                   BeneficiaryMapper beneficiaryMapper) {
        this.beneficiaryRepository = beneficiaryRepository;
        this.userRepository = userRepository;
        this.beneficiaryMapper = beneficiaryMapper;
    }

    // =========================================================================
    // CREATE
    // =========================================================================

    @Override
    public BeneficiaryDto createBeneficiary(BeneficiaryCreateDto createDto) {

        // --- Uniqueness: Aadhaar number ---
        if (beneficiaryRepository.existsByUniqueIdNumber(createDto.getUniqueIdNumber())) {
            throw new DuplicateResourceException(
                    "A beneficiary with Aadhaar number '" + createDto.getUniqueIdNumber() + "' already exists.");
        }

        // --- Uniqueness: Mobile number ---
        if (beneficiaryRepository.existsByPhoneNumber(createDto.getPhoneNumber())) {
            throw new DuplicateResourceException(
                    "A beneficiary with phone number '" + createDto.getPhoneNumber() + "' already exists.");
        }

        // --- Uniqueness: Bank account number ---
        if (beneficiaryRepository.existsByBankAccountNumber(createDto.getBankAccountNumber())) {
            throw new DuplicateResourceException(
                    "A beneficiary with bank account number '" + createDto.getBankAccountNumber() + "' already exists.");
        }

        // --- Enum parsing: eligibilityStatus ---
        VerificationStatus eligibilityStatus = parseEnum(
                VerificationStatus.class, createDto.getEligibilityStatus(),
                "eligibilityStatus", "PENDING, VERIFIED, REJECTED, RE_VERIFICATION_REQUESTED");

        // --- Enum parsing: gender ---
        Gender gender = parseEnum(
                Gender.class, createDto.getGender(),
                "gender", "MALE, FEMALE, OTHER");

        // --- Enum parsing: category ---
        BeneficiaryCategory category = parseEnum(
                BeneficiaryCategory.class, createDto.getCategory(),
                "category", "GENERAL, OBC, SC, ST, BPL");

        // --- Build entity ---
        Beneficiary beneficiary = Beneficiary.builder()
                .uniqueIdNumber(createDto.getUniqueIdNumber())
                .phoneNumber(createDto.getPhoneNumber())
                .address(createDto.getAddress())
                .district(createDto.getDistrict())
                .state(createDto.getState())
                .bankAccountNumber(createDto.getBankAccountNumber())
                .bankIfscCode(createDto.getBankIfscCode())
                .annualIncome(createDto.getAnnualIncome())
                .dateOfBirth(createDto.getDateOfBirth())
                .eligibilityStatus(eligibilityStatus)
                .gender(gender)
                .category(category)
                .occupation(createDto.getOccupation())
                .build();

        // --- Link User account (optional) ---
        if (createDto.getUserId() != null) {
            User user = userRepository.findById(createDto.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "User not found with ID: " + createDto.getUserId()));

            if (beneficiaryRepository.existsByUserId(createDto.getUserId())) {
                throw new DuplicateResourceException(
                        "User with ID " + createDto.getUserId() + " is already linked to an existing beneficiary profile.");
            }

            beneficiary.setUser(user);
        }

        Beneficiary saved = beneficiaryRepository.save(beneficiary);
        return beneficiaryMapper.toDto(saved);
    }

    // =========================================================================
    // READ ALL
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<BeneficiaryDto> getAllBeneficiaries() {
        return beneficiaryRepository.findAll()
                .stream()
                .map(beneficiaryMapper::toDto)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // READ BY ID
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public BeneficiaryDto getBeneficiaryById(Long id) {
        Beneficiary beneficiary = beneficiaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Beneficiary not found with ID: " + id));
        return beneficiaryMapper.toDto(beneficiary);
    }

    // =========================================================================
    // UPDATE
    // =========================================================================

    @Override
    public BeneficiaryDto updateBeneficiary(Long id, BeneficiaryUpdateDto updateDto) {

        // --- Existence check ---
        Beneficiary existing = beneficiaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Beneficiary not found with ID: " + id));

        // --- Uniqueness: Mobile number (excluding self) ---
        if (beneficiaryRepository.existsByPhoneNumberAndIdNot(updateDto.getPhoneNumber(), id)) {
            throw new DuplicateResourceException(
                    "Phone number '" + updateDto.getPhoneNumber() + "' is already in use by another beneficiary.");
        }

        // --- Uniqueness: Bank account number (excluding self) ---
        if (beneficiaryRepository.existsByBankAccountNumberAndIdNot(updateDto.getBankAccountNumber(), id)) {
            throw new DuplicateResourceException(
                    "Bank account number '" + updateDto.getBankAccountNumber() + "' is already in use by another beneficiary.");
        }

        // --- Enum parsing: eligibilityStatus ---
        VerificationStatus eligibilityStatus = parseEnum(
                VerificationStatus.class, updateDto.getEligibilityStatus(),
                "eligibilityStatus", "PENDING, VERIFIED, REJECTED, RE_VERIFICATION_REQUESTED");

        // --- Enum parsing: gender ---
        Gender gender = parseEnum(
                Gender.class, updateDto.getGender(),
                "gender", "MALE, FEMALE, OTHER");

        // --- Enum parsing: category ---
        BeneficiaryCategory category = parseEnum(
                BeneficiaryCategory.class, updateDto.getCategory(),
                "category", "GENERAL, OBC, SC, ST, BPL");

        // --- Apply changes (uniqueIdNumber and user are intentionally not updated) ---
        existing.setPhoneNumber(updateDto.getPhoneNumber());
        existing.setAddress(updateDto.getAddress());
        existing.setDistrict(updateDto.getDistrict());
        existing.setState(updateDto.getState());
        existing.setBankAccountNumber(updateDto.getBankAccountNumber());
        existing.setBankIfscCode(updateDto.getBankIfscCode());
        existing.setAnnualIncome(updateDto.getAnnualIncome());
        existing.setDateOfBirth(updateDto.getDateOfBirth());
        existing.setEligibilityStatus(eligibilityStatus);
        existing.setGender(gender);
        existing.setCategory(category);
        existing.setOccupation(updateDto.getOccupation());

        Beneficiary updated = beneficiaryRepository.save(existing);
        return beneficiaryMapper.toDto(updated);
    }

    // =========================================================================
    // DELETE
    // =========================================================================

    @Override
    public void deleteBeneficiary(Long id) {
        if (!beneficiaryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Beneficiary not found with ID: " + id);
        }
        beneficiaryRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public BeneficiaryDto getBeneficiaryByUsername(String username) {
        Beneficiary beneficiary = beneficiaryRepository.findByUserUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Beneficiary profile not found for user: " + username));
        return beneficiaryMapper.toDto(beneficiary);
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Parses a string value into the corresponding enum constant.
     *
     * @param enumClass    the enum class to parse into
     * @param value        the raw string value from the request
     * @param fieldName    the name of the DTO field (for error messages)
     * @param allowedValues a human-readable list of valid values (for error messages)
     * @param <T>          the enum type
     * @return the parsed enum constant
     * @throws IllegalArgumentException if the value is not a valid enum constant
     */
    private <T extends Enum<T>> T parseEnum(Class<T> enumClass, String value,
                                             String fieldName, String allowedValues) {
        try {
            return Enum.valueOf(enumClass, value.trim().toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalArgumentException(
                    "Invalid value '" + value + "' for field '" + fieldName + "'. " +
                            "Allowed values are: " + allowedValues);
        }
    }
}
