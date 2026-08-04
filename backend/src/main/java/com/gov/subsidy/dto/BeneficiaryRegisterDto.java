package com.gov.subsidy.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BeneficiaryRegisterDto {

    @NotBlank(message = "Full name is required")
    @Size(max = 100, message = "Full name must not exceed 100 characters")
    private String fullName;

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be at least 6 characters")
    private String password;

    @NotBlank(message = "Confirm password is required")
    private String confirmPassword;

    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    @NotBlank(message = "Mobile number is required")
    @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Mobile number must be valid (10 to 15 digits)")
    private String mobileNumber;

    @NotBlank(message = "Aadhaar / Unique ID is required")
    @Pattern(regexp = "^\\d{12}$", message = "Aadhaar / Unique ID must be a 12-digit number")
    private String aadhaarNumber;

    @NotBlank(message = "Gender is required")
    private String gender;

    @NotBlank(message = "Category is required")
    private String category;

    @NotNull(message = "Date of birth is required")
    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    @Size(max = 500, message = "Address must not exceed 500 characters")
    private String address;

    @NotBlank(message = "Bank account number is required")
    @Size(min = 9, max = 20, message = "Bank account number must be between 9 and 20 digits")
    private String bankAccountNumber;

    @NotBlank(message = "IFSC code is required")
    @Pattern(regexp = "^[A-Z]{4}0[A-Z0-9]{6}$", message = "IFSC code must be valid (e.g. SBIN0001234)")
    private String ifscCode;

    private String district;
    private String state;
    private String occupation;

    private String maritalStatus;
    private String disability;
    private String houseNo;
    private String street;
    private String city;
    private String country;
    private String pinCode;

    private java.math.BigDecimal annualIncome;
    private Integer familySize;
    private String rationCard;
    private String bplApl;

    private String accountHolder;
    private String bankName;
    private String passportPhoto;
}
