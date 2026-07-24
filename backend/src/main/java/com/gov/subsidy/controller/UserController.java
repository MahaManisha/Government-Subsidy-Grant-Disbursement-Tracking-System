package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.BaseResponse;
import com.gov.subsidy.dto.ResetPasswordDto;
import com.gov.subsidy.dto.UserCreateDto;
import com.gov.subsidy.dto.UserDto;
import com.gov.subsidy.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing Government Staff User accounts.
 *
 * <p><strong>Business Rule:</strong> This controller is for staff account management only.
 * Only ROLE_ADMIN can create, edit, reset passwords, activate, or deactivate staff accounts.
 * Citizen (beneficiary) self-registration is handled exclusively through
 * {@code POST /api/v1/auth/register}.</p>
 *
 * <p>Base URL: {@code /api/v1/users}</p>
 */
@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/users")
@Tag(
        name = "User Management",
        description = "Admin-only operations for creating and managing Government Staff accounts. " +
                "Beneficiary self-registration is handled via the /auth/register endpoint. " +
                "ROLE_BENEFICIARY cannot be assigned through this API."
)
@SecurityRequirement(name = "Bearer Authentication")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // =========================================================================
    // POST /v1/users — Create Staff Account (Admin Only)
    // =========================================================================

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Create a new Government Staff account (Admin only)",
            description = "Creates a new staff user account (Admin, Field Officer, District Officer, or Finance Officer). " +
                    "Password is BCrypt-encrypted. ROLE_BENEFICIARY is not allowed — " +
                    "citizens must self-register via POST /api/v1/auth/register."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Staff account created successfully",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid payload, role format, or ROLE_BENEFICIARY attempted"),
            @ApiResponse(responseCode = "403", description = "Access denied — ROLE_ADMIN required"),
            @ApiResponse(responseCode = "409", description = "Username or Email already exists")
    })
    public ResponseEntity<BaseResponse<UserDto>> createUser(@Valid @RequestBody UserCreateDto createDto) {
        UserDto created = userService.createUser(createDto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(BaseResponse.success(created, "Staff account created successfully"));
    }

    // =========================================================================
    // GET /v1/users — Get All Users (Admin Only)
    // =========================================================================

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Get all user accounts",
            description = "Lists all registered users (staff and beneficiaries) in the system. Admin only."
    )
    public ResponseEntity<BaseResponse<List<UserDto>>> getAllUsers() {
        List<UserDto> users = userService.getAllUsers();
        return ResponseEntity.ok(BaseResponse.success(users, "Users fetched successfully"));
    }

    // =========================================================================
    // GET /v1/users/me — Get Currently Authenticated User Profile
    // =========================================================================

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get current user profile",
            description = "Retrieves the user profile and officer details of the currently authenticated user."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Current profile fetched successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<BaseResponse<UserDto>> getCurrentUserProfile(java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(BaseResponse.error("Unauthenticated user session"));
        }
        UserDto user = userService.getUserByUsername(principal.getName());
        return ResponseEntity.ok(BaseResponse.success(user, "Current user profile fetched successfully"));
    }

    // =========================================================================
    // GET /v1/users/{id} — Get User By ID
    // =========================================================================

    @GetMapping("/{id}")
    @PostAuthorize("hasRole('ADMIN') or (returnObject != null && returnObject.body != null && returnObject.body.data != null && returnObject.body.data.username == principal.username)")
    @Operation(summary = "Get user profile by ID", description = "Retrieves a user's details by their database primary key.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User profile fetched successfully"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<BaseResponse<UserDto>> getUserById(
            @Parameter(description = "User primary key", example = "1", required = true)
            @PathVariable Long id) {
        UserDto user = userService.getUserById(id);
        return ResponseEntity.ok(BaseResponse.success(user, "User fetched successfully"));
    }

    // =========================================================================
    // PUT /v1/users/{id} — Update Staff Account (Admin Only)
    // =========================================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or (principal != null && principal.user.id == #id)")
    @Operation(
            summary = "Update an existing staff account",
            description = "Modifies a staff user's details and roles. ROLE_BENEFICIARY cannot be assigned here."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Staff account updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid payload or ROLE_BENEFICIARY attempted"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "409", description = "Username/Email conflict")
    })
    public ResponseEntity<BaseResponse<UserDto>> updateUser(
            @Parameter(description = "User primary key", example = "1", required = true)
            @PathVariable Long id,
            @Valid @RequestBody UserCreateDto createDto) {
        UserDto updated = userService.updateUser(id, createDto);
        return ResponseEntity.ok(BaseResponse.success(updated, "Staff account updated successfully"));
    }

    // =========================================================================
    // DELETE /v1/users/{id} — Deactivate User (Admin Only)
    // =========================================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Deactivate a user account (Admin only)",
            description = "Performs a soft delete by marking the user as inactive. The account can be re-activated."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User deactivated successfully"),
            @ApiResponse(responseCode = "403", description = "Access denied — ROLE_ADMIN required"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<BaseResponse<Void>> deleteUser(
            @Parameter(description = "User primary key", example = "1", required = true)
            @PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(BaseResponse.success(null, "User with ID " + id + " deactivated successfully"));
    }

    // =========================================================================
    // DELETE /v1/users/{id}/permanent — Permanent Delete (Admin Only)
    // =========================================================================

    @DeleteMapping("/{id}/permanent")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Permanently delete a user account from database (Admin only)",
            description = "Completely removes the user account from the database. This action cannot be undone."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User permanently deleted successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid delete parameters or business rule violations"),
            @ApiResponse(responseCode = "403", description = "Access denied — ROLE_ADMIN required"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<BaseResponse<Void>> deleteUserPermanently(
            @Parameter(description = "User primary key", example = "1", required = true)
            @PathVariable Long id,
            java.security.Principal principal) {
        userService.deleteUserPermanently(id, principal.getName());
        return ResponseEntity.ok(BaseResponse.success(null, "User with ID " + id + " permanently deleted"));
    }

    // =========================================================================
    // PATCH /v1/users/{id}/activate — Activate User (Admin Only)
    // =========================================================================

    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Activate a deactivated user account (Admin only)",
            description = "Re-enables a previously deactivated user account, allowing them to log in again."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User activated successfully"),
            @ApiResponse(responseCode = "400", description = "User is already active"),
            @ApiResponse(responseCode = "403", description = "Access denied — ROLE_ADMIN required"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<BaseResponse<Void>> activateUser(
            @Parameter(description = "User primary key", example = "1", required = true)
            @PathVariable Long id) {
        userService.activateUser(id);
        return ResponseEntity.ok(BaseResponse.success(null, "User with ID " + id + " activated successfully"));
    }

    // =========================================================================
    // PATCH /v1/users/{id}/reset-password — Reset Password (Admin Only)
    // =========================================================================

    @PatchMapping("/{id}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Reset a user's password (Admin only)",
            description = "Allows the Administrator to set a new password for any staff account. " +
                    "The new password is BCrypt-encrypted before storage. " +
                    "The Admin must securely communicate the new credentials to the staff member."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Password reset successfully"),
            @ApiResponse(responseCode = "400", description = "Passwords do not match or validation failed"),
            @ApiResponse(responseCode = "403", description = "Access denied — ROLE_ADMIN required"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<BaseResponse<Void>> resetPassword(
            @Parameter(description = "User primary key", example = "1", required = true)
            @PathVariable Long id,
            @Valid @RequestBody ResetPasswordDto resetDto) {
        userService.resetPassword(id, resetDto.getNewPassword(), resetDto.getConfirmPassword());
        return ResponseEntity.ok(BaseResponse.success(null, "Password reset successfully for user ID " + id));
    }
}
