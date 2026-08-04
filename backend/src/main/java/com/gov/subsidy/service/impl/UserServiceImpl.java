package com.gov.subsidy.service.impl;

import com.gov.subsidy.dto.UserCreateDto;
import com.gov.subsidy.dto.UserDto;
import com.gov.subsidy.entity.Role;
import com.gov.subsidy.entity.User;
import com.gov.subsidy.entity.AuditLog;
import com.gov.subsidy.enums.RoleType;
import com.gov.subsidy.exception.DuplicateResourceException;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.UserMapper;
import com.gov.subsidy.repository.RoleRepository;
import com.gov.subsidy.repository.UserRepository;
import com.gov.subsidy.repository.AuditLogRepository;
import com.gov.subsidy.repository.BeneficiaryRepository;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.VerificationRepository;
import com.gov.subsidy.repository.VerificationHistoryRepository;
import com.gov.subsidy.repository.ApplicationDocumentRepository;
import com.gov.subsidy.repository.RoutingRecordRepository;
import com.gov.subsidy.repository.DisbursementMilestoneRepository;
import com.gov.subsidy.repository.DisbursementPlanRepository;
import com.gov.subsidy.repository.DisbursementRepository;
import com.gov.subsidy.repository.WorkflowAuditLogRepository;
import com.gov.subsidy.service.UserService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Implementation of {@link UserService} containing all business logic for
 * User creation, retrieval, updates, and soft deletion.
 *
 * <p><strong>Business Rule:</strong> This service is for Government Staff accounts only.
 * Beneficiary (citizen) self-registration is handled exclusively by
 * {@link com.gov.subsidy.service.AuthRegistrationService}.
 * ROLE_BENEFICIARY is explicitly blocked in all write operations of this service.</p>
 */
@Service
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogRepository auditLogRepository;
    private final BeneficiaryRepository beneficiaryRepository;
    private final ApplicationRepository applicationRepository;
    private final VerificationRepository verificationRepository;
    private final VerificationHistoryRepository verificationHistoryRepository;
    private final ApplicationDocumentRepository applicationDocumentRepository;
    private final RoutingRecordRepository routingRecordRepository;
    private final DisbursementMilestoneRepository disbursementMilestoneRepository;
    private final DisbursementPlanRepository disbursementPlanRepository;
    private final DisbursementRepository disbursementRepository;
    private final WorkflowAuditLogRepository workflowAuditLogRepository;

    public UserServiceImpl(UserRepository userRepository,
                           RoleRepository roleRepository,
                           UserMapper userMapper,
                           PasswordEncoder passwordEncoder,
                           AuditLogRepository auditLogRepository,
                           BeneficiaryRepository beneficiaryRepository,
                           ApplicationRepository applicationRepository,
                           VerificationRepository verificationRepository,
                           VerificationHistoryRepository verificationHistoryRepository,
                           ApplicationDocumentRepository applicationDocumentRepository,
                           RoutingRecordRepository routingRecordRepository,
                           DisbursementMilestoneRepository disbursementMilestoneRepository,
                           DisbursementPlanRepository disbursementPlanRepository,
                           DisbursementRepository disbursementRepository,
                           WorkflowAuditLogRepository workflowAuditLogRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
        this.auditLogRepository = auditLogRepository;
        this.beneficiaryRepository = beneficiaryRepository;
        this.applicationRepository = applicationRepository;
        this.verificationRepository = verificationRepository;
        this.verificationHistoryRepository = verificationHistoryRepository;
        this.applicationDocumentRepository = applicationDocumentRepository;
        this.routingRecordRepository = routingRecordRepository;
        this.disbursementMilestoneRepository = disbursementMilestoneRepository;
        this.disbursementPlanRepository = disbursementPlanRepository;
        this.disbursementRepository = disbursementRepository;
        this.workflowAuditLogRepository = workflowAuditLogRepository;
    }

    // =========================================================================
    // Business Rule Enforcement
    // =========================================================================

    /**
     * Validates that no role in the provided set is ROLE_BENEFICIARY.
     * Government Staff accounts must not include the beneficiary role.
     *
     * @param roles set of role name strings to validate
     * @throws IllegalArgumentException if ROLE_BENEFICIARY is present
     */
    private void rejectBeneficiaryRole(Set<String> roles) {
        if (roles != null && roles.stream().anyMatch(r -> r.trim().equalsIgnoreCase("ROLE_BENEFICIARY"))) {
            throw new IllegalArgumentException(
                "ROLE_BENEFICIARY cannot be assigned via staff account creation. " +
                "Citizens must self-register through the public registration portal."
            );
        }
    }

    /**
     * Resolves a set of role name strings to {@link Role} entities.
     * Auto-seeds the role if not yet present in the database (handles fresh installs).
     */
    private Set<Role> resolveRoles(Set<String> roleNames) {
        Set<Role> resolvedRoles = new HashSet<>();
        if (roleNames != null) {
            for (String roleName : roleNames) {
                RoleType roleType;
                try {
                    roleType = RoleType.valueOf(roleName.trim());
                } catch (IllegalArgumentException e) {
                    throw new IllegalArgumentException(
                        "Invalid role: '" + roleName + "'. Allowed staff roles: " +
                        "ROLE_ADMIN, ROLE_FIELD_OFFICER, ROLE_DISTRICT_OFFICER, ROLE_FINANCE_OFFICER"
                    );
                }
                Role role = roleRepository.findByName(roleType)
                        .orElseGet(() -> roleRepository.save(
                                Role.builder()
                                        .name(roleType)
                                        .description("System role for " + roleType.name())
                                        .build()
                        ));
                resolvedRoles.add(role);
            }
        }
        return resolvedRoles;
    }

    // =========================================================================
    // CRUD Operations
    // =========================================================================

    @Override
    public UserDto createUser(UserCreateDto createDto) {
        // --- 1. Enforce: ROLE_BENEFICIARY is NOT allowed for staff accounts ---
        rejectBeneficiaryRole(createDto.getRoles());

        // --- 2. Validate password confirmation if confirmPassword is provided ---
        if (createDto.getConfirmPassword() != null && !createDto.getConfirmPassword().isBlank()) {
            if (!createDto.getPassword().equals(createDto.getConfirmPassword())) {
                throw new IllegalArgumentException("Passwords do not match.");
            }
        }

        // --- 3. Check uniqueness of username ---
        if (userRepository.existsByUsername(createDto.getUsername())) {
            throw new DuplicateResourceException("Username '" + createDto.getUsername() + "' is already taken.");
        }

        // --- 4. Check uniqueness of email ---
        if (userRepository.existsByEmail(createDto.getEmail())) {
            throw new DuplicateResourceException("Email '" + createDto.getEmail() + "' is already registered.");
        }

        // --- 5. Encrypt password ---
        String encryptedPassword = passwordEncoder.encode(createDto.getPassword());

        // --- 6. Resolve Roles (staff roles only) ---
        Set<Role> resolvedRoles = resolveRoles(createDto.getRoles());

        // --- 7. Build and save User entity ---
        User user = User.builder()
                .username(createDto.getUsername())
                .password(encryptedPassword)
                .email(createDto.getEmail())
                .firstName(createDto.getFirstName())
                .lastName(createDto.getLastName())
                .active(true)
                .roles(resolvedRoles)
                .build();

        User saved = userRepository.save(user);
        return userMapper.toDto(saved);
    }

    @Override
    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(userMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
        verifyIsStaff(user);
        return userMapper.toDto(user);
    }

    @Override
    public UserDto getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
        return userMapper.toDto(user);
    }

    @Override
    public UserDto updateUser(Long id, UserCreateDto createDto) {
        // --- 1. Enforce: ROLE_BENEFICIARY is NOT allowed for staff accounts ---
        rejectBeneficiaryRole(createDto.getRoles());

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
        verifyIsStaff(user);

        // --- 2. Uniqueness checks (excluding current user) ---
        if (!user.getUsername().equalsIgnoreCase(createDto.getUsername())
                && userRepository.existsByUsername(createDto.getUsername())) {
            throw new DuplicateResourceException("Username '" + createDto.getUsername() + "' is already taken.");
        }
        if (!user.getEmail().equalsIgnoreCase(createDto.getEmail())
                && userRepository.existsByEmail(createDto.getEmail())) {
            throw new DuplicateResourceException("Email '" + createDto.getEmail() + "' is already registered.");
        }

        user.setUsername(createDto.getUsername());
        user.setEmail(createDto.getEmail());
        user.setFirstName(createDto.getFirstName());
        user.setLastName(createDto.getLastName());

        // --- 3. Update password only if a new one is provided ---
        if (createDto.getPassword() != null && !createDto.getPassword().isBlank()
                && !createDto.getPassword().equals("unchanged_placeholder")
                && !createDto.getPassword().equals(user.getPassword())) {
            // Validate confirmation if provided
            if (createDto.getConfirmPassword() != null && !createDto.getConfirmPassword().isBlank()
                    && !createDto.getPassword().equals(createDto.getConfirmPassword())) {
                throw new IllegalArgumentException("Passwords do not match.");
            }
            user.setPassword(passwordEncoder.encode(createDto.getPassword()));
        }

        // --- 4. Resolve updated Roles ---
        Set<Role> resolvedRoles = resolveRoles(createDto.getRoles());
        user.setRoles(resolvedRoles);

        User saved = userRepository.save(user);
        return userMapper.toDto(saved);
    }

    @Override
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
        verifyIsStaff(user);
        user.setActive(false);
        userRepository.save(user);
    }

    // =========================================================================
    // Admin-Only Account Management Operations
    // =========================================================================

    @Override
    public void activateUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
        verifyIsStaff(user);
        if (user.isActive()) {
            throw new IllegalStateException("User with ID " + id + " is already active.");
        }
        user.setActive(true);
        userRepository.save(user);
    }

    @Override
    public void resetPassword(Long id, String newPassword, String confirmPassword) {
        // --- 1. Confirm passwords match ---
        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("Passwords do not match.");
        }

        // --- 2. Find user ---
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
        verifyIsStaff(user);

        // --- 3. Encode and persist ---
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private void verifyIsStaff(User user) {
        boolean isStaff = user.getRoles().stream()
                .anyMatch(r -> {
                    RoleType type = r.getName();
                    return type == RoleType.ROLE_ADMIN ||
                           type == RoleType.ROLE_FIELD_OFFICER ||
                           type == RoleType.ROLE_DISTRICT_OFFICER ||
                           type == RoleType.ROLE_FINANCE_OFFICER;
                });
        if (!isStaff) {
            throw new ResourceNotFoundException("User not found with ID: " + user.getId());
        }
    }

    @Override
    @Transactional
    public void deleteUserPermanently(Long id, String performingAdminUsername) {
        // 1. User exists
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));

        // 2. User is not the currently logged-in Admin
        if (user.getUsername().equalsIgnoreCase(performingAdminUsername)) {
            throw new IllegalStateException("You cannot permanently delete your own logged-in admin account.");
        }

        // 3. Prevent deletion of the last remaining Admin account
        boolean isAdmin = user.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleType.ROLE_ADMIN);
        if (isAdmin) {
            long adminCount = userRepository.findAll().stream()
                    .filter(u -> u.getRoles().stream().anyMatch(r -> r.getName() == RoleType.ROLE_ADMIN))
                    .count();
            if (adminCount <= 1) {
                throw new IllegalStateException("Cannot delete the last remaining Admin account in the system.");
            }
        }

        // 4. Cascade cleanup related records to allow permanent deletion of accounts:
        // Case A: Is the user a Beneficiary?
        com.gov.subsidy.entity.Beneficiary beneficiary = beneficiaryRepository.findByUserId(id).orElse(null);
        if (beneficiary != null) {
            List<com.gov.subsidy.entity.Application> apps = applicationRepository.findByBeneficiaryId(beneficiary.getId());
            for (com.gov.subsidy.entity.Application app : apps) {
                // Remove workflow audit logs
                List<com.gov.subsidy.entity.WorkflowAuditLog> wLogs = workflowAuditLogRepository.findByApplicationIdOrderByOccurredAtAsc(app.getId());
                if (wLogs != null && !wLogs.isEmpty()) {
                    workflowAuditLogRepository.deleteAll(wLogs);
                }

                // Remove verification history and verification
                verificationRepository.findByApplicationId(app.getId()).ifPresent(v -> {
                    List<com.gov.subsidy.entity.VerificationHistory> vhList = verificationHistoryRepository.findByVerificationIdOrderByActionDateAsc(v.getId());
                    if (vhList != null && !vhList.isEmpty()) {
                        verificationHistoryRepository.deleteAll(vhList);
                    }
                    verificationRepository.delete(v);
                });

                // Remove application documents
                List<com.gov.subsidy.entity.ApplicationDocument> docs = applicationDocumentRepository.findByApplicationId(app.getId());
                if (docs != null && !docs.isEmpty()) {
                    applicationDocumentRepository.deleteAll(docs);
                }

                // Remove routing records
                List<com.gov.subsidy.entity.RoutingRecord> rrs = routingRecordRepository.findByApplicationIdOrderByRoutedAtAsc(app.getId());
                if (rrs != null && !rrs.isEmpty()) {
                    routingRecordRepository.deleteAll(rrs);
                }

                // Remove disbursements, plans, milestones
                disbursementPlanRepository.findByApplicationId(app.getId()).ifPresent(plan -> {
                    List<com.gov.subsidy.entity.DisbursementMilestone> ms = disbursementMilestoneRepository.findByDisbursementPlanIdOrderByMilestoneNumberAsc(plan.getId());
                    if (ms != null && !ms.isEmpty()) {
                        disbursementMilestoneRepository.deleteAll(ms);
                    }
                    disbursementPlanRepository.delete(plan);
                });

                List<com.gov.subsidy.entity.Disbursement> disbursements = disbursementRepository.findByApplicationId(app.getId());
                if (disbursements != null && !disbursements.isEmpty()) {
                    disbursementRepository.deleteAll(disbursements);
                }

                // Delete application
                applicationRepository.delete(app);
            }

            // Delete documents linked directly to beneficiary
            List<com.gov.subsidy.entity.ApplicationDocument> bDocs = applicationDocumentRepository.findByBeneficiaryId(beneficiary.getId());
            if (bDocs != null && !bDocs.isEmpty()) {
                applicationDocumentRepository.deleteAll(bDocs);
            }

            // Delete beneficiary profile
            beneficiaryRepository.delete(beneficiary);
        }

        // Case B: Is the user a Staff officer? Unassign officer references to prevent FK constraint failures.
        List<com.gov.subsidy.entity.Application> assignedApps = applicationRepository.findByAssignedOfficerId(id);
        if (assignedApps != null && !assignedApps.isEmpty()) {
            for (com.gov.subsidy.entity.Application app : assignedApps) {
                app.setAssignedOfficer(null);
                applicationRepository.save(app);
            }
        }

        List<com.gov.subsidy.entity.Verification> verifications = verificationRepository.findByFieldOfficerId(id);
        if (verifications != null && !verifications.isEmpty()) {
            for (com.gov.subsidy.entity.Verification v : verifications) {
                v.setFieldOfficer(null);
                verificationRepository.save(v);
            }
        }

        List<com.gov.subsidy.entity.VerificationHistory> vhList = verificationHistoryRepository.findByOfficerId(id);
        if (vhList != null && !vhList.isEmpty()) {
            for (com.gov.subsidy.entity.VerificationHistory vh : vhList) {
                vh.setOfficer(null);
                verificationHistoryRepository.save(vh);
            }
        }

        // 5. Write Audit Log entry
        AuditLog auditLog = AuditLog.builder()
                .action("PERMANENT_DELETE")
                .performedBy(performingAdminUsername)
                .details("Permanently deleted user: " + user.getUsername() + " (ID: " + id + ", Email: " + user.getEmail() + ")")
                .timestamp(LocalDateTime.now())
                .ipAddress(null)
                .build();
        auditLogRepository.save(auditLog);

        // 6. Delete user permanently from database
        userRepository.delete(user);
    }

    @Override
    @Transactional
    public int purgeDummyUsers(String performingAdminUsername) {
        List<User> allUsers = userRepository.findAll();
        int deletedCount = 0;
        for (User user : allUsers) {
            if (user.getUsername() == null || user.getUsername().equalsIgnoreCase(performingAdminUsername)) {
                continue;
            }
            String email = user.getEmail() != null ? user.getEmail().toLowerCase() : "";
            String username = user.getUsername().toLowerCase();

            // Identify dummy/test accounts
            boolean isDummy = email.endsWith("@example.com") ||
                              email.endsWith("@govsubsidy.gov") ||
                              username.contains("tester") ||
                              username.contains("ravi") ||
                              username.contains("johndoe") ||
                              username.equals("beneficiary_demo");

            if (isDummy) {
                try {
                    deleteUserPermanently(user.getId(), performingAdminUsername);
                    deletedCount++;
                } catch (Exception e) {
                    // Log & continue purging remaining
                }
            }
        }
        return deletedCount;
    }
}
