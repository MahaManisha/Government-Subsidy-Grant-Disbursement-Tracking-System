package com.gov.subsidy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BeneficiaryDto {

    private Long id;
    private UserDto user;
    private String uniqueIdNumber;
    private String phoneNumber;
    private String address;
    private String district;
    private String state;
    private String bankAccountNumber;
    private String bankIfscCode;
    private BigDecimal annualIncome;
    private LocalDate dateOfBirth;
    private String eligibilityStatus;
    private String gender;
    private String category;
    private String occupation;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}
