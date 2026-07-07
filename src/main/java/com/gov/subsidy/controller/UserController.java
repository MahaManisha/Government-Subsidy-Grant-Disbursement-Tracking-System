package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.BaseResponse;
import com.gov.subsidy.dto.UserCreateDto;
import com.gov.subsidy.dto.UserDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/users")
public class UserController {

    @PostMapping
    public ResponseEntity<BaseResponse<UserDto>> createUser(@Valid @RequestBody UserCreateDto createDto) {
        UserDto mockUser = UserDto.builder()
                .id(1L)
                .username(createDto.getUsername())
                .email(createDto.getEmail())
                .firstName(createDto.getFirstName())
                .lastName(createDto.getLastName())
                .active(true)
                .roles(createDto.getRoles())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();
        
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(BaseResponse.success(mockUser, "User created successfully"));
    }

    @GetMapping
    public ResponseEntity<BaseResponse<List<UserDto>>> getAllUsers() {
        UserDto mockUser1 = UserDto.builder()
                .id(1L)
                .username("john_doe")
                .email("john.doe@example.com")
                .firstName("John")
                .lastName("Doe")
                .active(true)
                .roles(new HashSet<>(Arrays.asList("ROLE_FIELD_OFFICER")))
                .createdAt(LocalDateTime.now().minusDays(2))
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        UserDto mockUser2 = UserDto.builder()
                .id(2L)
                .username("citizen_smith")
                .email("smith@example.com")
                .firstName("Alice")
                .lastName("Smith")
                .active(true)
                .roles(new HashSet<>(Arrays.asList("ROLE_BENEFICIARY")))
                .createdAt(LocalDateTime.now().minusDays(1))
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        List<UserDto> mockUsers = Arrays.asList(mockUser1, mockUser2);
        return ResponseEntity.ok(BaseResponse.success(mockUsers, "Users fetched successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<UserDto>> getUserById(@PathVariable Long id) {
        UserDto mockUser = UserDto.builder()
                .id(id)
                .username("mock_user_" + id)
                .email("mock" + id + "@example.com")
                .firstName("Mock")
                .lastName("User")
                .active(true)
                .roles(new HashSet<>(Arrays.asList("ROLE_DISTRICT_OFFICER")))
                .createdAt(LocalDateTime.now().minusDays(5))
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        return ResponseEntity.ok(BaseResponse.success(mockUser, "User fetched successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<UserDto>> updateUser(@PathVariable Long id, @Valid @RequestBody UserCreateDto createDto) {
        UserDto updatedUser = UserDto.builder()
                .id(id)
                .username(createDto.getUsername())
                .email(createDto.getEmail())
                .firstName(createDto.getFirstName())
                .lastName(createDto.getLastName())
                .active(true)
                .roles(createDto.getRoles())
                .createdAt(LocalDateTime.now().minusDays(5))
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        return ResponseEntity.ok(BaseResponse.success(updatedUser, "User updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> deleteUser(@PathVariable Long id) {
        return ResponseEntity.ok(BaseResponse.success(null, "User with ID " + id + " deactivated successfully"));
    }
}
