package com.gov.subsidy.controller;

import com.gov.subsidy.dto.BaseResponse;
import com.gov.subsidy.dto.LoginRequestDto;
import com.gov.subsidy.dto.LoginResponseDto;
import com.gov.subsidy.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collections;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthControllerTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private com.gov.subsidy.service.AuthRegistrationService authRegistrationService;

    @InjectMocks
    private AuthController authController;

    private LoginRequestDto loginRequest;
    private UserDetails userDetails;
    private Authentication authentication;

    @BeforeEach
    public void setUp() {
        loginRequest = LoginRequestDto.builder()
                .username("admin")
                .password("password")
                .build();

        GrantedAuthority authority = new SimpleGrantedAuthority("ROLE_ADMIN");
        userDetails = new User("admin", "password", Collections.singletonList(authority));
        authentication = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
    }

    @Test
    public void testLogin_Success() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(jwtService.generateToken(userDetails)).thenReturn("mock-jwt-token");
        when(jwtService.getExpirationTime()).thenReturn(86400000L);

        ResponseEntity<BaseResponse<LoginResponseDto>> response = authController.login(loginRequest);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals("Authentication successful", response.getBody().getMessage());
        assertEquals("mock-jwt-token", response.getBody().getData().getToken());
        assertEquals("admin", response.getBody().getData().getUsername());
        assertTrue(response.getBody().getData().getRoles().contains("ROLE_ADMIN"));

        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtService).generateToken(userDetails);
    }

    @Test
    public void testLogin_BadCredentials() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Invalid username or password"));

        ResponseEntity<BaseResponse<LoginResponseDto>> response = authController.login(loginRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
        assertEquals("Invalid username or password", response.getBody().getMessage());

        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtService, never()).generateToken(any());
    }

    @Test
    public void testLogin_DisabledAccount() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new DisabledException("User account is deactivated"));

        ResponseEntity<BaseResponse<LoginResponseDto>> response = authController.login(loginRequest);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
        assertEquals("User account is deactivated", response.getBody().getMessage());

        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtService, never()).generateToken(any());
    }

    @Test
    public void testRefresh_NotImplemented() {
        ResponseEntity<BaseResponse<LoginResponseDto>> response = authController.refresh();
        assertEquals(HttpStatus.NOT_IMPLEMENTED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
        assertEquals("Token refresh functionality is not implemented yet.", response.getBody().getMessage());
    }

    @Test
    public void testLogout_Success() {
        ResponseEntity<BaseResponse<Void>> response = authController.logout();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals("Logout successful. Client should discard the token.", response.getBody().getMessage());
    }

    @Test
    public void testRegister_Success() {
        com.gov.subsidy.dto.BeneficiaryRegisterDto registerDto = com.gov.subsidy.dto.BeneficiaryRegisterDto.builder()
                .fullName("John Doe")
                .username("johndoe")
                .password("password")
                .confirmPassword("password")
                .email("john@example.com")
                .mobileNumber("9876543210")
                .aadhaarNumber("123456789012")
                .gender("MALE")
                .category("GENERAL")
                .dateOfBirth(java.time.LocalDate.of(1990, 1, 1))
                .address("123 Street")
                .bankAccountNumber("123456789")
                .ifscCode("SBIN0001234")
                .build();

        com.gov.subsidy.dto.BeneficiaryDto mockDto = com.gov.subsidy.dto.BeneficiaryDto.builder()
                .id(1L)
                .uniqueIdNumber("123456789012")
                .phoneNumber("9876543210")
                .build();

        when(authRegistrationService.registerBeneficiary(any(com.gov.subsidy.dto.BeneficiaryRegisterDto.class)))
                .thenReturn(mockDto);

        ResponseEntity<BaseResponse<com.gov.subsidy.dto.BeneficiaryDto>> response = authController.register(registerDto);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals("Beneficiary registered successfully", response.getBody().getMessage());
        assertEquals(1L, response.getBody().getData().getId());
        assertEquals("123456789012", response.getBody().getData().getUniqueIdNumber());

        verify(authRegistrationService).registerBeneficiary(registerDto);
    }
}
