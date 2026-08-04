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
    private String maritalStatus;
    private String disabilityStatus;
    private String houseNo;
    private String street;
    private String city;
    private String country;
    private String pinCode;
    private Integer familySize;
    private String rationCardNumber;
    private String bplAplStatus;
    private String accountHolderName;
    private String bankName;
    private String passportPhotoUrl;
    private String verifiedBy;
    private LocalDateTime verifiedDate;
    private String rejectedBy;
    private LocalDateTime rejectedDate;
    private String rejectionReason;
    private String approvalRemarks;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}
