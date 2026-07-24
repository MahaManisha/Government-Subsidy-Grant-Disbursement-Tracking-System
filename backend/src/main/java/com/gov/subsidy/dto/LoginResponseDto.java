package com.gov.subsidy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponseDto {

    private String token;
    
    @Builder.Default
    private String tokenType = "Bearer";
    
    private long expiresIn;
    
    private Long id;

    private String username;
    
    private Set<String> roles;
}
