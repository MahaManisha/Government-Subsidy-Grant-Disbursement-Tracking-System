package com.gov.subsidy.service;

import com.gov.subsidy.dto.UserDto;
import com.gov.subsidy.entity.Role;
import com.gov.subsidy.entity.User;
import com.gov.subsidy.enums.RoleType;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.UserMapper;
import com.gov.subsidy.repository.RoleRepository;
import com.gov.subsidy.repository.UserRepository;
import com.gov.subsidy.repository.AuditLogRepository;
import com.gov.subsidy.repository.BeneficiaryRepository;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.VerificationRepository;
import com.gov.subsidy.repository.VerificationHistoryRepository;
import com.gov.subsidy.service.impl.UserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private UserMapper userMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private BeneficiaryRepository beneficiaryRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private VerificationRepository verificationRepository;

    @Mock
    private VerificationHistoryRepository verificationHistoryRepository;

    @InjectMocks
    private UserServiceImpl userService;

    private User staffUser;
    private User beneficiaryUser;
    private Role staffRole;
    private Role beneficiaryRole;

    @BeforeEach
    public void setUp() {
        staffRole = Role.builder()
                .id(1L)
                .name(RoleType.ROLE_ADMIN)
                .description("Admin")
                .build();

        beneficiaryRole = Role.builder()
                .id(2L)
                .name(RoleType.ROLE_BENEFICIARY)
                .description("Beneficiary")
                .build();

        staffUser = User.builder()
                .id(1L)
                .username("admin_staff")
                .email("admin@gov.in")
                .firstName("Admin")
                .lastName("Staff")
                .active(true)
                .roles(Set.of(staffRole))
                .build();

        beneficiaryUser = User.builder()
                .id(2L)
                .username("citizen_ben")
                .email("citizen@example.com")
                .firstName("Citizen")
                .lastName("Beneficiary")
                .active(true)
                .roles(Set.of(beneficiaryRole))
                .build();
    }

    @Test
    public void testGetAllUsers_ReturnsOnlyStaff() {
        Set<RoleType> staffRoles = Set.of(
                RoleType.ROLE_ADMIN,
                RoleType.ROLE_FIELD_OFFICER,
                RoleType.ROLE_DISTRICT_OFFICER,
                RoleType.ROLE_FINANCE_OFFICER
        );
        when(userRepository.findAll()).thenReturn(List.of(staffUser));
        UserDto dto = UserDto.builder().username("admin_staff").build();
        when(userMapper.toDto(staffUser)).thenReturn(dto);

        List<UserDto> result = userService.getAllUsers();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("admin_staff", result.get(0).getUsername());
        verify(userRepository).findAll();
    }

    @Test
    public void testGetUserById_Staff_Success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(staffUser));
        UserDto dto = UserDto.builder().username("admin_staff").build();
        when(userMapper.toDto(staffUser)).thenReturn(dto);

        UserDto result = userService.getUserById(1L);

        assertNotNull(result);
        assertEquals("admin_staff", result.getUsername());
    }

    @Test
    public void testGetUserById_Beneficiary_ThrowsException() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(beneficiaryUser));

        assertThrows(ResourceNotFoundException.class, () -> {
            userService.getUserById(2L);
        });
    }

    @Test
    public void testResetPassword_Success() {
        staffUser.setPassword("oldEncoded");
        when(userRepository.findById(1L)).thenReturn(Optional.of(staffUser));
        when(passwordEncoder.encode("newPassword123")).thenReturn("newEncoded");

        userService.resetPassword(1L, "newPassword123", "newPassword123");

        assertEquals("newEncoded", staffUser.getPassword());
        verify(userRepository).save(staffUser);
    }

    @Test
    public void testUpdateUser_UnchangedPlaceholder_DoesNotChangePassword() {
        staffUser.setPassword("oldEncodedPassword");
        com.gov.subsidy.dto.UserCreateDto createDto = com.gov.subsidy.dto.UserCreateDto.builder()
                .firstName("Admin")
                .lastName("Staff")
                .username("admin_staff")
                .email("admin@gov.in")
                .password("unchanged_placeholder")
                .roles(Set.of("ROLE_ADMIN"))
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(staffUser));
        when(roleRepository.findByName(RoleType.ROLE_ADMIN)).thenReturn(Optional.of(staffRole));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        userService.updateUser(1L, createDto);

        assertEquals("oldEncodedPassword", staffUser.getPassword());
        verify(passwordEncoder, never()).encode(anyString());
    }

    @Test
    public void testDeleteUserPermanently_Success() {
        User target = User.builder()
                .id(3L)
                .username("officer_to_delete")
                .email("officer@gov.in")
                .roles(Set.of(Role.builder().name(RoleType.ROLE_FIELD_OFFICER).build()))
                .build();

        when(userRepository.findById(3L)).thenReturn(Optional.of(target));
        when(beneficiaryRepository.findByUserId(3L)).thenReturn(Optional.empty());
        when(applicationRepository.findByAssignedOfficerId(3L)).thenReturn(Collections.emptyList());
        when(verificationRepository.findByFieldOfficerId(3L)).thenReturn(Collections.emptyList());
        when(verificationHistoryRepository.findByOfficerId(3L)).thenReturn(Collections.emptyList());

        userService.deleteUserPermanently(3L, "admin_staff");

        verify(userRepository).delete(target);
        verify(auditLogRepository).save(any(com.gov.subsidy.entity.AuditLog.class));
    }

    @Test
    public void testDeleteUserPermanently_SelfDelete_ThrowsException() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(staffUser));

        assertThrows(IllegalStateException.class, () -> {
            userService.deleteUserPermanently(1L, "admin_staff");
        });

        verify(userRepository, never()).delete(any());
    }

    @Test
    public void testDeleteUserPermanently_LastAdmin_ThrowsException() {
        User adminTarget = User.builder()
                .id(4L)
                .username("other_admin")
                .roles(Set.of(staffRole))
                .build();

        when(userRepository.findById(4L)).thenReturn(Optional.of(adminTarget));
        when(userRepository.findAll()).thenReturn(List.of(adminTarget));

        assertThrows(IllegalStateException.class, () -> {
            userService.deleteUserPermanently(4L, "admin_staff");
        });

        verify(userRepository, never()).delete(any());
    }
}
