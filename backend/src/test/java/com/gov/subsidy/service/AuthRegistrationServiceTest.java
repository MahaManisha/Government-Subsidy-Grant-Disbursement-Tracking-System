package com.gov.subsidy.service;

import com.gov.subsidy.dto.BeneficiaryDto;
import com.gov.subsidy.dto.BeneficiaryRegisterDto;
import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.entity.Role;
import com.gov.subsidy.entity.User;
import com.gov.subsidy.enums.RoleType;
import com.gov.subsidy.exception.DuplicateResourceException;
import com.gov.subsidy.mapper.BeneficiaryMapper;
import com.gov.subsidy.repository.BeneficiaryRepository;
import com.gov.subsidy.repository.RoleRepository;
import com.gov.subsidy.repository.UserRepository;
import com.gov.subsidy.service.impl.AuthRegistrationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthRegistrationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private BeneficiaryRepository beneficiaryRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private BeneficiaryMapper beneficiaryMapper;

    @InjectMocks
    private AuthRegistrationServiceImpl registrationService;

    private BeneficiaryRegisterDto registerDto;
    private Role beneficiaryRole;

    @BeforeEach
    public void setUp() {
        registerDto = BeneficiaryRegisterDto.builder()
                .fullName("Rajesh Kumar")
                .username("rajesh_kumar")
                .password("password123")
                .confirmPassword("password123")
                .email("rajesh@example.com")
                .mobileNumber("9876543210")
                .aadhaarNumber("987654321012")
                .gender("MALE")
                .category("GENERAL")
                .dateOfBirth(LocalDate.of(1995, 5, 20))
                .address("123 Street, Gandhinagar")
                .bankAccountNumber("987654321098")
                .ifscCode("SBIN0004321")
                .build();

        beneficiaryRole = Role.builder()
                .id(1L)
                .name(RoleType.ROLE_BENEFICIARY)
                .description("System role for ROLE_BENEFICIARY")
                .build();
    }

    @Test
    public void testRegisterBeneficiary_Success() {
        when(userRepository.existsByUsername(registerDto.getUsername())).thenReturn(false);
        when(userRepository.existsByEmail(registerDto.getEmail())).thenReturn(false);
        when(beneficiaryRepository.existsByUniqueIdNumber(registerDto.getAadhaarNumber())).thenReturn(false);
        when(beneficiaryRepository.existsByPhoneNumber(registerDto.getMobileNumber())).thenReturn(false);
        when(beneficiaryRepository.existsByBankAccountNumber(registerDto.getBankAccountNumber())).thenReturn(false);
        when(roleRepository.findByName(RoleType.ROLE_BENEFICIARY)).thenReturn(Optional.of(beneficiaryRole));
        when(passwordEncoder.encode(registerDto.getPassword())).thenReturn("encryptedPassword");
        
        User mockUser = User.builder().id(10L).username("rajesh_kumar").build();
        when(userRepository.save(any(User.class))).thenReturn(mockUser);

        Beneficiary mockBeneficiary = Beneficiary.builder().id(20L).user(mockUser).uniqueIdNumber("987654321012").build();
        when(beneficiaryRepository.save(any(Beneficiary.class))).thenReturn(mockBeneficiary);

        BeneficiaryDto mockDto = BeneficiaryDto.builder().id(20L).uniqueIdNumber("987654321012").build();
        when(beneficiaryMapper.toDto(any(Beneficiary.class))).thenReturn(mockDto);

        BeneficiaryDto result = registrationService.registerBeneficiary(registerDto);

        assertNotNull(result);
        assertEquals(20L, result.getId());
        assertEquals("987654321012", result.getUniqueIdNumber());

        verify(userRepository).save(any(User.class));
        verify(beneficiaryRepository).save(any(Beneficiary.class));
    }

    @Test
    public void testRegisterBeneficiary_PasswordsDoNotMatch() {
        registerDto.setConfirmPassword("differentPassword");

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            registrationService.registerBeneficiary(registerDto);
        });

        assertEquals("Passwords do not match", exception.getMessage());
        verify(userRepository, never()).save(any());
        verify(beneficiaryRepository, never()).save(any());
    }

    @Test
    public void testRegisterBeneficiary_DuplicateUsername() {
        when(userRepository.existsByUsername(registerDto.getUsername())).thenReturn(true);

        DuplicateResourceException exception = assertThrows(DuplicateResourceException.class, () -> {
            registrationService.registerBeneficiary(registerDto);
        });

        assertEquals("Username 'rajesh_kumar' is already taken.", exception.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    public void testRegisterBeneficiary_DuplicateAadhaar() {
        when(userRepository.existsByUsername(registerDto.getUsername())).thenReturn(false);
        when(userRepository.existsByEmail(registerDto.getEmail())).thenReturn(false);
        when(beneficiaryRepository.existsByUniqueIdNumber(registerDto.getAadhaarNumber())).thenReturn(true);

        DuplicateResourceException exception = assertThrows(DuplicateResourceException.class, () -> {
            registrationService.registerBeneficiary(registerDto);
        });

        assertEquals("A beneficiary with Aadhaar number '987654321012' already exists.", exception.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    public void testRegisterBeneficiary_NullAddress_AssemblesAddressFromSeparateFields() {
        registerDto.setAddress(null);
        registerDto.setHouseNo("12B");
        registerDto.setStreet("MG Road");
        registerDto.setCity("Chennai");
        registerDto.setDistrict("Chennai");
        registerDto.setState("Tamil Nadu");
        registerDto.setPinCode("600001");

        when(userRepository.existsByUsername(registerDto.getUsername())).thenReturn(false);
        when(userRepository.existsByEmail(registerDto.getEmail())).thenReturn(false);
        when(beneficiaryRepository.existsByUniqueIdNumber(registerDto.getAadhaarNumber())).thenReturn(false);
        when(beneficiaryRepository.existsByPhoneNumber(registerDto.getMobileNumber())).thenReturn(false);
        when(beneficiaryRepository.existsByBankAccountNumber(registerDto.getBankAccountNumber())).thenReturn(false);
        when(roleRepository.findByName(RoleType.ROLE_BENEFICIARY)).thenReturn(Optional.of(beneficiaryRole));
        when(passwordEncoder.encode(registerDto.getPassword())).thenReturn("encryptedPassword");

        User mockUser = User.builder().id(10L).username("rajesh_kumar").build();
        when(userRepository.save(any(User.class))).thenReturn(mockUser);

        Beneficiary mockBeneficiary = Beneficiary.builder().id(20L).user(mockUser).uniqueIdNumber("987654321012").build();
        when(beneficiaryRepository.save(any(Beneficiary.class))).thenReturn(mockBeneficiary);

        BeneficiaryDto mockDto = BeneficiaryDto.builder().id(20L).uniqueIdNumber("987654321012").build();
        when(beneficiaryMapper.toDto(any(Beneficiary.class))).thenReturn(mockDto);

        BeneficiaryDto result = registrationService.registerBeneficiary(registerDto);

        assertNotNull(result);
        verify(beneficiaryRepository).save(argThat(beneficiary ->
                "12B, MG Road, Chennai, Chennai, Tamil Nadu - 600001".equals(beneficiary.getAddress())
        ));
    }
}
