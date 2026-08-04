package com.gov.subsidy.service;

import com.gov.subsidy.dto.UserCreateDto;
import com.gov.subsidy.dto.UserDto;

import java.util.List;

/**
 * Service interface for managing User accounts.
 */
public interface UserService {

    /**
     * Creates a new staff user account with encrypted password and assigned roles.
     * ROLE_BENEFICIARY is NOT allowed via this method — use AuthRegistrationService for citizen registration.
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
     * ROLE_BENEFICIARY is NOT allowed to be assigned via this method.
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

    /**
     * Permanently deletes a user account from the database (hard delete).
     *
     * @param id                      User primary key
     * @param performingAdminUsername Username of the admin performing the deletion
     */
    void deleteUserPermanently(Long id, String performingAdminUsername);

    /**
     * Activates a previously deactivated user account.
     * Only ROLE_ADMIN should invoke this method.
     *
     * @param id User primary key
     */
    void activateUser(Long id);

    /**
     * Resets a user's password. Encrypts the new password with BCrypt before persisting.
     * Only ROLE_ADMIN should invoke this method.
     *
     * @param id          User primary key
     * @param newPassword the plain-text new password (will be BCrypt-encoded)
     * @param confirmPassword must match newPassword
     */
    void resetPassword(Long id, String newPassword, String confirmPassword);

    /**
     * Purges dummy and test user accounts from the database.
     *
     * @param performingAdminUsername Username of the admin performing the purge
     * @return count of deleted dummy users
     */
    int purgeDummyUsers(String performingAdminUsername);

    /**
     * Retrieves a single user by username.
     *
     * @param username User's unique username
     * @return the matched UserDto
     */
    UserDto getUserByUsername(String username);
}
