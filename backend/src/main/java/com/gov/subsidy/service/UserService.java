package com.gov.subsidy.service;

import com.gov.subsidy.dto.UserCreateDto;
import com.gov.subsidy.dto.UserDto;

import java.util.List;

/**
 * Service interface for managing User accounts.
 */
public interface UserService {

    /**
     * Creates a new user in the system with encrypted password and assigned roles.
     *
     * @param createDto DTO containing user registration details
     * @return the created UserDto
     */
    UserDto createUser(UserCreateDto createDto);

    /**
     * Retrieves all registered users.
     *
     * @return list of UserDto
     */
    List<UserDto> getAllUsers();

    /**
     * Retrieves a single user by primary key ID.
     *
     * @param id User primary key
     * @return the matched UserDto
     */
    UserDto getUserById(Long id);

    /**
     * Updates an existing user's details.
     *
     * @param id        User primary key
     * @param createDto DTO containing updated user details
     * @return the updated UserDto
     */
    UserDto updateUser(Long id, UserCreateDto createDto);

    /**
     * Deactivates a user account (soft delete).
     *
     * @param id User primary key
     */
    void deleteUser(Long id);
}
