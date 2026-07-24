package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.BaseResponse;
import com.gov.subsidy.dto.LoginRequestDto;
import com.gov.subsidy.dto.LoginResponseDto;
import com.gov.subsidy.security.JwtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import com.gov.subsidy.dto.BeneficiaryDto;
import com.gov.subsidy.dto.BeneficiaryRegisterDto;
import com.gov.subsidy.security.CustomUserDetails;
import com.gov.subsidy.service.AuthRegistrationService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;
import java.util.stream.Collectors;

/**
 * Controller managing Authentication and Authorization endpoints (login, logout, refresh).
 */
@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/auth")
@Tag(name = "Authentication & Authorization", description = "Endpoints for user login, logout, and token refresh")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final AuthRegistrationService authRegistrationService;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService, AuthRegistrationService authRegistrationService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.authRegistrationService = authRegistrationService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new Beneficiary (Citizen)", description = "Public endpoint for citizens to register themselves as a beneficiary.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully registered beneficiary",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input or validation failed"),
            @ApiResponse(responseCode = "409", description = "Duplicate resource conflict")
    })
    public ResponseEntity<BaseResponse<BeneficiaryDto>> register(@Valid @RequestBody BeneficiaryRegisterDto request) {
        BeneficiaryDto registered = authRegistrationService.registerBeneficiary(request);
        return ResponseEntity.ok(BaseResponse.success(registered, "Beneficiary registered successfully"));
    }


    @PostMapping("/login")
    @Operation(summary = "Authenticate user and return JWT token", description = "Verifies username and password, then returns JWT Bearer token and user details.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully authenticated",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class))),
            @ApiResponse(responseCode = "401", description = "Invalid credentials"),
            @ApiResponse(responseCode = "403", description = "Account is disabled")
    })
    public ResponseEntity<BaseResponse<LoginResponseDto>> login(@Valid @RequestBody LoginRequestDto request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );

            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String token = jwtService.generateToken(userDetails);

            Long userId = null;
            if (userDetails instanceof CustomUserDetails customUserDetails) {
                userId = customUserDetails.getUser().getId();
            }

            Set<String> roles = userDetails.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .collect(Collectors.toSet());

            LoginResponseDto responseData = LoginResponseDto.builder()
                    .token(token)
                    .expiresIn(jwtService.getExpirationTime())
                    .id(userId)
                    .username(userDetails.getUsername())
                    .roles(roles)
                    .build();

            return ResponseEntity.ok(BaseResponse.success(responseData, "Authentication successful"));

        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(BaseResponse.error("Invalid username or password"));
        } catch (DisabledException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(BaseResponse.error("User account is deactivated"));
        } catch (AuthenticationException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(BaseResponse.error("Authentication failed: " + e.getMessage()));
        }
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh JWT Token (Optional)", description = "Generates a new JWT token for a valid refresh request.")
    public ResponseEntity<BaseResponse<LoginResponseDto>> refresh() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body(BaseResponse.error("Token refresh functionality is not implemented yet."));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout User (Optional Placeholder)", description = "Placeholder endpoint for client-side logout coordination.")
    public ResponseEntity<BaseResponse<Void>> logout() {
        return ResponseEntity.ok(BaseResponse.success(null, "Logout successful. Client should discard the token."));
    }
}
