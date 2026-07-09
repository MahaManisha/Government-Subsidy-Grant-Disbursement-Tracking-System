package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.BaseResponse;
import com.gov.subsidy.dto.UserCreateDto;
import com.gov.subsidy.dto.UserDto;
import com.gov.subsidy.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing User accounts in the Government Subsidy System.
 *
 * <p>Base URL: {@code /api/v1/users}</p>
 */
@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/users")
@Tag(
        name = "User Management",
        description = "Operations for user registration, updates, retrieval, and deactivation. " +
                "New user sign-ups are processed here."
)
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // =========================================================================
    // POST /v1/users — Create User
    // =========================================================================

    @PostMapping
    @Operation(
            summary = "Create a new user account",
            description = "Registers a new user (admin, officer, or beneficiary) in the system. " +
                    "Encrypts the user's password and assigns standard roles."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "User created successfully",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid payload or role format"),
            @ApiResponse(responseCode = "409", description = "Username or Email already exists")
    })
    public ResponseEntity<BaseResponse<UserDto>> createUser(@Valid @RequestBody UserCreateDto createDto) {
        UserDto created = userService.createUser(createDto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(BaseResponse.success(created, "User created successfully"));
    }

    // =========================================================================
    // GET /v1/users — Get All Users
    // =========================================================================

    @GetMapping
    @Operation(summary = "Get all user profiles", description = "Lists all registered users in the system.")
    public ResponseEntity<BaseResponse<List<UserDto>>> getAllUsers() {
        List<UserDto> users = userService.getAllUsers();
        return ResponseEntity.ok(BaseResponse.success(users, "Users fetched successfully"));
    }

    // =========================================================================
    // GET /v1/users/{id} — Get User By ID
    // =========================================================================

    @GetMapping("/{id}")
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
    // PUT /v1/users/{id} — Update User
    // =========================================================================

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing user", description = "Modifies a user's basic details and roles.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User profile updated successfully"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "409", description = "Username/Email conflict")
    })
    public ResponseEntity<BaseResponse<UserDto>> updateUser(
            @Parameter(description = "User primary key", example = "1", required = true)
            @PathVariable Long id,
            @Valid @RequestBody UserCreateDto createDto) {
        UserDto updated = userService.updateUser(id, createDto);
        return ResponseEntity.ok(BaseResponse.success(updated, "User updated successfully"));
    }

    // =========================================================================
    // DELETE /v1/users/{id} — Delete User (Deactivate)
    // =========================================================================

    @DeleteMapping("/{id}")
    @Operation(summary = "Deactivate a user account", description = "Performs a soft delete by marking the user as inactive.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User deactivated successfully"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<BaseResponse<Void>> deleteUser(
            @Parameter(description = "User primary key", example = "1", required = true)
            @PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(BaseResponse.success(null, "User with ID " + id + " deactivated successfully"));
    }
}
