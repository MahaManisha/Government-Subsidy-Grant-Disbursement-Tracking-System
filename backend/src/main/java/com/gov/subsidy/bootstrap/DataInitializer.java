package com.gov.subsidy.bootstrap;

import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.entity.Role;
import com.gov.subsidy.entity.Scheme;
import com.gov.subsidy.entity.User;
import com.gov.subsidy.enums.BeneficiaryCategory;
import com.gov.subsidy.enums.Gender;
import com.gov.subsidy.enums.RoleType;
import com.gov.subsidy.enums.SchemeStatus;
import com.gov.subsidy.enums.VerificationStatus;
import com.gov.subsidy.repository.BeneficiaryRepository;
import com.gov.subsidy.repository.RoleRepository;
import com.gov.subsidy.repository.SchemeRepository;
import com.gov.subsidy.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Bootstrap class to seed initial roles, default staff accounts, sample beneficiary,
 * and active government subsidy schemes upon application startup.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final SchemeRepository schemeRepository;
    private final BeneficiaryRepository beneficiaryRepository;
    private final PasswordEncoder passwordEncoder;

    private final javax.sql.DataSource dataSource;

    public DataInitializer(UserRepository userRepository,
                           RoleRepository roleRepository,
                           SchemeRepository schemeRepository,
                           BeneficiaryRepository beneficiaryRepository,
                           PasswordEncoder passwordEncoder,
                           javax.sql.DataSource dataSource) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.schemeRepository = schemeRepository;
        this.beneficiaryRepository = beneficiaryRepository;
        this.passwordEncoder = passwordEncoder;
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) throws Exception {
        try (java.sql.Connection conn = dataSource.getConnection()) {
            log.info("==========================================");
            log.info("DATABASE VERIFIED: URL = {}", conn.getMetaData().getURL());
            log.info("DATABASE PRODUCT: {}", conn.getMetaData().getDatabaseProductName());
            log.info("==========================================");
        } catch (Exception e) {
            log.warn("Database metadata inspection warning: {}", e.getMessage());
        }

        log.info("Initializing database seed data: roles, default accounts, and schemes...");
        seedRoles();
        seedDefaultUsers();
        seedSampleSchemes();
        log.info("Database seed data initialization complete.");
    }

    private void seedRoles() {
        for (RoleType roleType : RoleType.values()) {
            roleRepository.findByName(roleType).orElseGet(() -> {
                Role newRole = Role.builder()
                        .name(roleType)
                        .description("System default role for " + roleType.name())
                        .build();
                log.info("Seeded role: {}", roleType);
                return roleRepository.save(newRole);
            });
        }
    }

    private void seedDefaultUsers() {
        createStaffUserIfMissing("admin", "admin123", "admin@subsidy.gov.in", "System", "Admin", RoleType.ROLE_ADMIN);
        createStaffUserIfMissing("field_officer", "password123", "field.officer@subsidy.gov.in", "Field", "Officer", RoleType.ROLE_FIELD_OFFICER);
        createStaffUserIfMissing("district_officer", "password123", "district.officer@subsidy.gov.in", "District", "Officer", RoleType.ROLE_DISTRICT_OFFICER);
        createStaffUserIfMissing("finance_officer", "password123", "finance.officer@subsidy.gov.in", "Finance", "Officer", RoleType.ROLE_FINANCE_OFFICER);
    }

    private void createStaffUserIfMissing(String username, String rawPassword, String email, String firstName, String lastName, RoleType roleType) {
        if (!userRepository.existsByUsername(username)) {
            Role role = roleRepository.findByName(roleType)
                    .orElseThrow(() -> new IllegalStateException("Role not found: " + roleType));

            Set<Role> roles = new HashSet<>(Collections.singletonList(role));

            User user = User.builder()
                    .username(username)
                    .password(passwordEncoder.encode(rawPassword))
                    .email(email)
                    .firstName(firstName)
                    .lastName(lastName)
                    .active(true)
                    .roles(roles)
                    .build();

            userRepository.save(user);
            log.info("Seeded default user account: username='{}', role='{}'", username, roleType);
        }
    }

    private void seedSampleSchemes() {
        if (schemeRepository.count() == 0) {
            log.info("Seeding initial government subsidy schemes...");

            createSchemeIfMissing(
                    "PM-KISAN Agri Machinery Subsidy",
                    "PM-AGRI-2026",
                    "Subsidized agricultural machinery, tractors, and solar pumps for small and marginal farmers to improve crop yield.",
                    new BigDecimal("5000000.00"),
                    new BigDecimal("5000000.00"),
                    LocalDate.of(2026, 1, 1),
                    LocalDate.of(2026, 12, 31),
                    SchemeStatus.ACTIVE,
                    18, 65, new BigDecimal("250000.00"), "ALL", "GENERAL", "FARMER", "ALL", "ALL", "Aadhaar, Land Records, Income Certificate", new BigDecimal("150000.00")
            );

            createSchemeIfMissing(
                    "National Solar Rooftop Grant",
                    "SOLAR-GRID-2026",
                    "Capital subsidy up to 40% for residential solar rooftop panel installations promoting green energy transition.",
                    new BigDecimal("7500000.00"),
                    new BigDecimal("7500000.00"),
                    LocalDate.of(2026, 1, 1),
                    LocalDate.of(2027, 3, 31),
                    SchemeStatus.ACTIVE,
                    21, 75, new BigDecimal("600000.00"), "ALL", "ALL", "ALL", "ALL", "ALL", "Aadhaar, Electricity Bill, Roof Ownership Document", new BigDecimal("100000.00")
            );

            createSchemeIfMissing(
                    "PMAY Urban Housing Assistance Grant",
                    "PMAY-URBAN-2026",
                    "Direct financial disbursement for economically weaker sections (EWS) to construct permanent pucka houses.",
                    new BigDecimal("10000000.00"),
                    new BigDecimal("10000000.00"),
                    LocalDate.of(2026, 1, 1),
                    LocalDate.of(2028, 12, 31),
                    SchemeStatus.ACTIVE,
                    18, 70, new BigDecimal("300000.00"), "ALL", "ALL", "ALL", "ALL", "ALL", "Aadhaar, Income Proof, Property Document, Bank Passbook", new BigDecimal("250000.00")
            );

            createSchemeIfMissing(
                    "Women Entrepreneurship Support Incentive",
                    "WED-INCENTIVE-2026",
                    "Micro-grants and interest subvention for women entrepreneurs establishing small cottage industries and SHGs.",
                    new BigDecimal("3500000.00"),
                    new BigDecimal("3500000.00"),
                    LocalDate.of(2026, 2, 1),
                    LocalDate.of(2026, 11, 30),
                    SchemeStatus.ACTIVE,
                    18, 60, new BigDecimal("400000.00"), "FEMALE", "ALL", "SELF_EMPLOYED", "ALL", "ALL", "Aadhaar, Business Registration, Bank Account Statement", new BigDecimal("75000.00")
            );
        }
    }

    private void createSchemeIfMissing(String name, String code, String description, BigDecimal budget, BigDecimal remaining,
                                       LocalDate start, LocalDate end, SchemeStatus status, Integer minAge, Integer maxAge,
                                       BigDecimal maxIncome, String gender, String category, String occupation, String state,
                                       String district, String reqDocs, BigDecimal maxGrant) {
        if (!schemeRepository.existsByCode(code)) {
            Scheme scheme = Scheme.builder()
                    .name(name)
                    .code(code)
                    .description(description)
                    .budgetAllocation(budget)
                    .remainingBudget(remaining)
                    .startDate(start)
                    .endDate(end)
                    .status(status)
                    .active(true)
                    .minAge(minAge)
                    .maxAge(maxAge)
                    .maxAnnualIncome(maxIncome)
                    .gender(gender)
                    .category(category)
                    .occupation(occupation)
                    .state(state)
                    .district(district)
                    .requiredDocuments(reqDocs)
                    .maxGrantAmount(maxGrant)
                    .build();
            schemeRepository.save(scheme);
            log.info("Seeded scheme: {} [{}]", name, code);
        }
    }

    private void seedSampleBeneficiary() {
        String username = "beneficiary_demo";
        if (!userRepository.existsByUsername(username)) {
            Role role = roleRepository.findByName(RoleType.ROLE_BENEFICIARY)
                    .orElseThrow(() -> new IllegalStateException("Role not found: ROLE_BENEFICIARY"));

            User user = User.builder()
                    .username(username)
                    .password(passwordEncoder.encode("password123"))
                    .email("beneficiary@subsidy.gov.in")
                    .firstName("Ramesh")
                    .lastName("Kumar")
                    .active(true)
                    .roles(new HashSet<>(Collections.singletonList(role)))
                    .build();

            User savedUser = userRepository.save(user);

            Beneficiary beneficiary = Beneficiary.builder()
                    .user(savedUser)
                    .uniqueIdNumber("123456789012")
                    .phoneNumber("+919876543210")
                    .address("Village Rampur, Post Office Subhash Nagar")
                    .district("Central District")
                    .state("Delhi")
                    .bankAccountNumber("987654321098")
                    .bankIfscCode("SBIN0001234")
                    .dateOfBirth(LocalDate.of(1988, 5, 15))
                    .annualIncome(new BigDecimal("120000.00"))
                    .eligibilityStatus(VerificationStatus.VERIFIED)
                    .gender(Gender.MALE)
                    .category(BeneficiaryCategory.GENERAL)
                    .occupation("Farmer")
                    .build();

            beneficiaryRepository.save(beneficiary);
            log.info("Seeded sample beneficiary account and profile for username='{}'", username);
        }
    }
}
