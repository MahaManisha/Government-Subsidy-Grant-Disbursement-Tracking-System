package com.gov.subsidy.service.impl;

import com.gov.subsidy.dto.BeneficiaryDto;
import com.gov.subsidy.dto.BeneficiaryRegisterDto;
import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.entity.Role;
import com.gov.subsidy.entity.User;
import com.gov.subsidy.enums.BeneficiaryCategory;
import com.gov.subsidy.enums.Gender;
import com.gov.subsidy.enums.RoleType;
import com.gov.subsidy.enums.VerificationStatus;
import com.gov.subsidy.exception.DuplicateResourceException;
import com.gov.subsidy.mapper.BeneficiaryMapper;
import com.gov.subsidy.repository.BeneficiaryRepository;
import com.gov.subsidy.repository.RoleRepository;
import com.gov.subsidy.repository.UserRepository;
import com.gov.subsidy.service.AuthRegistrationService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;

@Service
@Transactional
public class AuthRegistrationServiceImpl implements AuthRegistrationService {

    private final UserRepository userRepository;
    private final BeneficiaryRepository beneficiaryRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final BeneficiaryMapper beneficiaryMapper;

    public AuthRegistrationServiceImpl(UserRepository userRepository,
                                       BeneficiaryRepository beneficiaryRepository,
                                       RoleRepository roleRepository,
                                       PasswordEncoder passwordEncoder,
                                       BeneficiaryMapper beneficiaryMapper) {
        this.userRepository = userRepository;
        this.beneficiaryRepository = beneficiaryRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.beneficiaryMapper = beneficiaryMapper;
    }

    @Override
    public BeneficiaryDto registerBeneficiary(BeneficiaryRegisterDto registerDto) {
        // 1. Password confirmation check
        if (!registerDto.getPassword().equals(registerDto.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        // 2. Uniqueness: Username
        if (userRepository.existsByUsername(registerDto.getUsername())) {
            throw new DuplicateResourceException("Username '" + registerDto.getUsername() + "' is already taken.");
        }

        // 3. Uniqueness: Email
        if (userRepository.existsByEmail(registerDto.getEmail())) {
            throw new DuplicateResourceException("Email '" + registerDto.getEmail() + "' is already registered.");
        }

        // 4. Uniqueness: Aadhaar Number
        if (beneficiaryRepository.existsByUniqueIdNumber(registerDto.getAadhaarNumber())) {
            throw new DuplicateResourceException(
                    "A beneficiary with Aadhaar number '" + registerDto.getAadhaarNumber() + "' already exists.");
        }

        // 5. Uniqueness: Phone Number (Mobile)
        if (beneficiaryRepository.existsByPhoneNumber(registerDto.getMobileNumber())) {
            throw new DuplicateResourceException(
                    "A beneficiary with phone number '" + registerDto.getMobileNumber() + "' already exists.");
        }

        // 6. Uniqueness: Bank Account Number
        if (beneficiaryRepository.existsByBankAccountNumber(registerDto.getBankAccountNumber())) {
            throw new DuplicateResourceException(
                    "A beneficiary with bank account number '" + registerDto.getBankAccountNumber() + "' already exists.");
        }

        // 7. Parse Gender & Beneficiary Category
        Gender gender = parseEnum(Gender.class, registerDto.getGender(), "gender", "MALE, FEMALE, OTHER");
        BeneficiaryCategory category = parseEnum(BeneficiaryCategory.class, registerDto.getCategory(), "category", "GENERAL, OBC, SC, ST, BPL");

        // 8. Resolve Role (ROLE_BENEFICIARY)
        Role beneficiaryRole = roleRepository.findByName(RoleType.ROLE_BENEFICIARY)
                .orElseGet(() -> roleRepository.save(
                        Role.builder()
                                .name(RoleType.ROLE_BENEFICIARY)
                                .description("System role for ROLE_BENEFICIARY")
                                .build()
                ));

        // 9. Split Full Name into First and Last names
        String firstName = "";
        String lastName = "";
        if (registerDto.getFullName() != null && !registerDto.getFullName().trim().isEmpty()) {
            String[] parts = registerDto.getFullName().trim().split("\\s+", 2);
            firstName = parts[0];
            if (parts.length > 1) {
                lastName = parts[1];
            } else {
                lastName = parts[0]; // fallback
            }
        } else {
            firstName = "Citizen";
            lastName = "User";
        }

        // 10. Build and save User
        User user = User.builder()
                .username(registerDto.getUsername())
                .password(passwordEncoder.encode(registerDto.getPassword()))
                .email(registerDto.getEmail())
                .firstName(firstName)
                .lastName(lastName)
                .active(true)
                .roles(new HashSet<>(Collections.singletonList(beneficiaryRole)))
                .build();

        User savedUser = userRepository.save(user);

        BigDecimal annualIncome = registerDto.getAnnualIncome() != null ? registerDto.getAnnualIncome() : BigDecimal.ZERO;
        String address = registerDto.getAddress();
        if (address == null || address.isBlank()) {
            List<String> parts = new java.util.ArrayList<>();
            if (registerDto.getHouseNo() != null && !registerDto.getHouseNo().isBlank()) parts.add(registerDto.getHouseNo());
            if (registerDto.getStreet() != null && !registerDto.getStreet().isBlank()) parts.add(registerDto.getStreet());
            if (registerDto.getCity() != null && !registerDto.getCity().isBlank()) parts.add(registerDto.getCity());
            if (registerDto.getDistrict() != null && !registerDto.getDistrict().isBlank()) parts.add(registerDto.getDistrict());
            if (registerDto.getState() != null && !registerDto.getState().isBlank()) {
                String statePin = registerDto.getState();
                if (registerDto.getPinCode() != null && !registerDto.getPinCode().isBlank()) {
                    statePin += " - " + registerDto.getPinCode();
                }
                parts.add(statePin);
            } else if (registerDto.getPinCode() != null && !registerDto.getPinCode().isBlank()) {
                parts.add(registerDto.getPinCode());
            }
            address = String.join(", ", parts);
        }
        if (address == null || address.isBlank()) {
            address = "N/A";
        }

        // 11. Build and save Beneficiary
        Beneficiary beneficiary = Beneficiary.builder()
                .user(savedUser)
                .uniqueIdNumber(registerDto.getAadhaarNumber())
                .phoneNumber(registerDto.getMobileNumber())
                .address(address)
                .district(registerDto.getDistrict())
                .state(registerDto.getState())
                .bankAccountNumber(registerDto.getBankAccountNumber())
                .bankIfscCode(registerDto.getIfscCode())
                .dateOfBirth(registerDto.getDateOfBirth())
                .annualIncome(annualIncome)
                .eligibilityStatus(VerificationStatus.PENDING)
                .gender(gender)
                .category(category)
                .occupation(registerDto.getOccupation())
                .maritalStatus(registerDto.getMaritalStatus())
                .disabilityStatus(registerDto.getDisability())
                .houseNo(registerDto.getHouseNo())
                .street(registerDto.getStreet())
                .city(registerDto.getCity())
                .country(registerDto.getCountry() != null ? registerDto.getCountry() : "India")
                .pinCode(registerDto.getPinCode())
                .familySize(registerDto.getFamilySize())
                .rationCardNumber(registerDto.getRationCard())
                .bplAplStatus(registerDto.getBplApl())
                .accountHolderName(registerDto.getAccountHolder())
                .bankName(registerDto.getBankName())
                .passportPhotoUrl(registerDto.getPassportPhoto())
                .build();

        Beneficiary savedBeneficiary = beneficiaryRepository.save(beneficiary);

        return beneficiaryMapper.toDto(savedBeneficiary);
    }

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
