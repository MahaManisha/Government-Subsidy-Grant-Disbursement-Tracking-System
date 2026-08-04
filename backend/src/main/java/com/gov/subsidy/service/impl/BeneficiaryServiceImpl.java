package com.gov.subsidy.service.impl;

import com.gov.subsidy.dto.BeneficiaryCreateDto;
import com.gov.subsidy.dto.BeneficiaryDto;
import com.gov.subsidy.dto.BeneficiaryUpdateDto;
import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.entity.User;
import com.gov.subsidy.enums.BeneficiaryCategory;
import com.gov.subsidy.enums.Gender;
import com.gov.subsidy.enums.VerificationStatus;
import com.gov.subsidy.exception.BeneficiaryHasDependenciesException;
import com.gov.subsidy.exception.DuplicateResourceException;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.BeneficiaryMapper;
import com.gov.subsidy.repository.ApplicationDocumentRepository;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.BeneficiaryRepository;
import com.gov.subsidy.repository.ComplianceRepository;
import com.gov.subsidy.repository.FundUtilizationRepository;
import com.gov.subsidy.entity.AuditLog;
import com.gov.subsidy.repository.ApplicationDocumentRepository;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.AuditLogRepository;
import com.gov.subsidy.repository.BeneficiaryRepository;
import com.gov.subsidy.repository.ComplianceRepository;
import com.gov.subsidy.repository.FundUtilizationRepository;
import com.gov.subsidy.repository.UserRepository;
import com.gov.subsidy.service.BeneficiaryService;
import com.gov.subsidy.service.EmailService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implementation of {@link BeneficiaryService} containing all business logic
 * for beneficiary CRUD operations and approval workflow transitions.
 */
@Service
@Transactional
public class BeneficiaryServiceImpl implements BeneficiaryService {

    private final BeneficiaryRepository beneficiaryRepository;
    private final UserRepository userRepository;
    private final BeneficiaryMapper beneficiaryMapper;
    private final ApplicationRepository applicationRepository;
    private final ApplicationDocumentRepository applicationDocumentRepository;
    private final ComplianceRepository complianceRepository;
    private final FundUtilizationRepository fundUtilizationRepository;
    private final AuditLogRepository auditLogRepository;
    private final EmailService emailService;

    public BeneficiaryServiceImpl(BeneficiaryRepository beneficiaryRepository,
                                   UserRepository userRepository,
                                   BeneficiaryMapper beneficiaryMapper,
                                   ApplicationRepository applicationRepository,
                                   ApplicationDocumentRepository applicationDocumentRepository,
                                   ComplianceRepository complianceRepository,
                                   FundUtilizationRepository fundUtilizationRepository,
                                   AuditLogRepository auditLogRepository,
                                   EmailService emailService) {
        this.beneficiaryRepository = beneficiaryRepository;
        this.userRepository = userRepository;
        this.beneficiaryMapper = beneficiaryMapper;
        this.applicationRepository = applicationRepository;
        this.applicationDocumentRepository = applicationDocumentRepository;
        this.complianceRepository = complianceRepository;
        this.fundUtilizationRepository = fundUtilizationRepository;
        this.auditLogRepository = auditLogRepository;
        this.emailService = emailService;
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
        Beneficiary beneficiary = beneficiaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Beneficiary not found with ID: " + id));

        boolean hasApplications = applicationRepository.existsByBeneficiaryId(id);
        boolean hasDocs = applicationDocumentRepository.existsByBeneficiaryId(id);
        boolean hasCompliance = complianceRepository.existsByBeneficiaryId(id);
        boolean hasFundUtilization = fundUtilizationRepository.existsByBeneficiaryId(id);

        if (hasApplications || hasDocs || hasCompliance || hasFundUtilization) {
            throw new BeneficiaryHasDependenciesException(
                    "This beneficiary cannot be permanently deleted because application or verification records exist.");
        }

        beneficiaryRepository.delete(beneficiary);
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
    // APPROVAL WORKFLOW
    // =========================================================================

    @Override
    @Transactional
    public BeneficiaryDto approveBeneficiary(Long id, String remarks, String adminUsername) {
        Beneficiary beneficiary = beneficiaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Beneficiary not found with ID: " + id));

        beneficiary.setEligibilityStatus(VerificationStatus.VERIFIED);
        beneficiary.setVerifiedBy(adminUsername != null ? adminUsername : "ADMIN");
        beneficiary.setVerifiedDate(LocalDateTime.now());
        beneficiary.setApprovalRemarks(remarks);

        Beneficiary saved = beneficiaryRepository.save(beneficiary);

        saveAuditLog("BENEFICIARY_APPROVED", adminUsername != null ? adminUsername : "ADMIN",
                "Beneficiary ID: " + id + " [" + beneficiary.getUniqueIdNumber() + "] approved. Remarks: " + (remarks != null ? remarks : "N/A"));

        if (beneficiary.getUser() != null && beneficiary.getUser().getEmail() != null) {
            try {
                emailService.sendEmail(
                        beneficiary.getUser().getEmail(),
                        "Beneficiary Registration Approved",
                        "Dear " + beneficiary.getUser().getFirstName() + ",\n\nYour citizen beneficiary registration profile has been VERIFIED & APPROVED by administration.\n\nApproval Remarks: " + (remarks != null ? remarks : "None") + "\n\nYou may now apply for government subsidy schemes through the portal."
                );
            } catch (Exception ignored) {}
        }

        return beneficiaryMapper.toDto(saved);
    }

    @Override
    @Transactional
    public BeneficiaryDto rejectBeneficiary(Long id, String reason, String adminUsername) {
        Beneficiary beneficiary = beneficiaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Beneficiary not found with ID: " + id));

        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Rejection reason is required.");
        }

        beneficiary.setEligibilityStatus(VerificationStatus.REJECTED);
        beneficiary.setRejectedBy(adminUsername != null ? adminUsername : "ADMIN");
        beneficiary.setRejectedDate(LocalDateTime.now());
        beneficiary.setRejectionReason(reason);
        beneficiary.setApprovalRemarks(reason);

        Beneficiary saved = beneficiaryRepository.save(beneficiary);

        saveAuditLog("BENEFICIARY_REJECTED", adminUsername != null ? adminUsername : "ADMIN",
                "Beneficiary ID: " + id + " [" + beneficiary.getUniqueIdNumber() + "] rejected. Reason: " + reason);

        if (beneficiary.getUser() != null && beneficiary.getUser().getEmail() != null) {
            try {
                emailService.sendEmail(
                        beneficiary.getUser().getEmail(),
                        "Beneficiary Registration Rejected",
                        "Dear " + beneficiary.getUser().getFirstName() + ",\n\nYour citizen beneficiary registration profile has been REJECTED by administration.\n\nRejection Reason: " + reason
                );
            } catch (Exception ignored) {}
        }

        return beneficiaryMapper.toDto(saved);
    }

    @Override
    @Transactional
    public BeneficiaryDto requestChanges(Long id, String remarks, String adminUsername) {
        Beneficiary beneficiary = beneficiaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Beneficiary not found with ID: " + id));

        if (remarks == null || remarks.isBlank()) {
            throw new IllegalArgumentException("Remarks detailing requested changes are required.");
        }

        beneficiary.setEligibilityStatus(VerificationStatus.CHANGES_REQUIRED);
        beneficiary.setApprovalRemarks(remarks);

        Beneficiary saved = beneficiaryRepository.save(beneficiary);

        saveAuditLog("BENEFICIARY_CHANGES_REQUESTED", adminUsername != null ? adminUsername : "ADMIN",
                "Changes requested for Beneficiary ID: " + id + ". Remarks: " + remarks);

        if (beneficiary.getUser() != null && beneficiary.getUser().getEmail() != null) {
            try {
                emailService.sendEmail(
                        beneficiary.getUser().getEmail(),
                        "Action Required: Changes Requested for Registration",
                        "Dear " + beneficiary.getUser().getFirstName() + ",\n\nAn administrator has requested changes to your beneficiary profile.\n\nRequested Changes: " + remarks + "\n\nPlease log into the portal to update your profile and resubmit."
                );
            } catch (Exception ignored) {}
        }

        return beneficiaryMapper.toDto(saved);
    }

    @Override
    @Transactional
    public BeneficiaryDto resubmitBeneficiary(Long id) {
        Beneficiary beneficiary = beneficiaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Beneficiary not found with ID: " + id));

        beneficiary.setEligibilityStatus(VerificationStatus.PENDING);
        Beneficiary saved = beneficiaryRepository.save(beneficiary);

        String username = beneficiary.getUser() != null ? beneficiary.getUser().getUsername() : "BENEFICIARY";
        saveAuditLog("BENEFICIARY_RESUBMITTED", username,
                "Beneficiary ID: " + id + " resubmitted profile for verification.");

        return beneficiaryMapper.toDto(saved);
    }

    private void saveAuditLog(String action, String performedBy, String details) {
        try {
            AuditLog log = AuditLog.builder()
                    .action(action)
                    .performedBy(performedBy)
                    .details(details)
                    .timestamp(LocalDateTime.now())
                    .build();
            auditLogRepository.save(log);
        } catch (Exception ignored) {}
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

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
