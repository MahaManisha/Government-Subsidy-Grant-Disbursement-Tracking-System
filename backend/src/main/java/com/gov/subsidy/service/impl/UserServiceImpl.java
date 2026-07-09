package com.gov.subsidy.service.impl;

import com.gov.subsidy.dto.UserCreateDto;
import com.gov.subsidy.dto.UserDto;
import com.gov.subsidy.entity.Role;
import com.gov.subsidy.entity.User;
import com.gov.subsidy.enums.RoleType;
import com.gov.subsidy.exception.DuplicateResourceException;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.UserMapper;
import com.gov.subsidy.repository.RoleRepository;
import com.gov.subsidy.repository.UserRepository;
import com.gov.subsidy.service.UserService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Implementation of {@link UserService} containing all business logic for
 * User creation, retrieval, updates, and soft deletion.
 */
@Service
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    public UserServiceImpl(UserRepository userRepository,
                           RoleRepository roleRepository,
                           UserMapper userMapper,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public UserDto createUser(UserCreateDto createDto) {
        // --- 1. Check uniqueness of username ---
        if (userRepository.existsByUsername(createDto.getUsername())) {
            throw new DuplicateResourceException("Username '" + createDto.getUsername() + "' is already taken.");
        }

        // --- 2. Check uniqueness of email ---
        if (userRepository.existsByEmail(createDto.getEmail())) {
            throw new DuplicateResourceException("Email '" + createDto.getEmail() + "' is already registered.");
        }

        // --- 3. Encrypt password ---
        String encryptedPassword = passwordEncoder.encode(createDto.getPassword());

        // --- 4. Resolve Roles ---
        Set<Role> resolvedRoles = new HashSet<>();
        if (createDto.getRoles() != null) {
            for (String roleName : createDto.getRoles()) {
                RoleType roleType;
                try {
                    roleType = RoleType.valueOf(roleName.trim());
                } catch (IllegalArgumentException e) {
                    throw new IllegalArgumentException("Invalid role: '" + roleName + "'. Allowed roles: " +
                            "ROLE_ADMIN, ROLE_FIELD_OFFICER, ROLE_DISTRICT_OFFICER, ROLE_FINANCE_OFFICER, ROLE_BENEFICIARY");
                }

                // Retrieve role, or seed it automatically if missing in new database
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

        // --- 5. Build and save User entity ---
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
    @Transactional(readOnly = true)
    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(userMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
        return userMapper.toDto(user);
    }

    @Override
    public UserDto updateUser(Long id, UserCreateDto createDto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));

        // Uniqueness checks (excluding current user)
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

        // Update password if changed (not matches already encrypted)
        if (!createDto.getPassword().isBlank() && !createDto.getPassword().equals(user.getPassword())) {
            user.setPassword(passwordEncoder.encode(createDto.getPassword()));
        }

        // Resolve updated Roles
        Set<Role> resolvedRoles = new HashSet<>();
        if (createDto.getRoles() != null) {
            for (String roleName : createDto.getRoles()) {
                RoleType roleType = RoleType.valueOf(roleName.trim());
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
        user.setRoles(resolvedRoles);

        User saved = userRepository.save(user);
        return userMapper.toDto(saved);
    }

    @Override
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
        user.setActive(false);
        userRepository.save(user);
    }
}
