package com.gov.subsidy.entity;

import com.gov.subsidy.enums.BeneficiaryCategory;
import com.gov.subsidy.enums.Gender;
import com.gov.subsidy.enums.VerificationStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

@Entity
@Table(name = "beneficiaries", indexes = {
        @Index(name = "idx_beneficiaries_uid", columnList = "unique_id_number", unique = true),
        @Index(name = "idx_beneficiaries_user_id", columnList = "user_id", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Beneficiary extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, foreignKey = @ForeignKey(name = "fk_beneficiary_user"))
    private User user;

    @NotBlank(message = "Unique Identification Number is required")
    @Size(max = 20, message = "Unique Identification Number must not exceed 20 characters")
    @Column(name = "unique_id_number", unique = true, nullable = false, length = 20)
    private String uniqueIdNumber;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Phone number must be valid (10 to 15 digits)")
    @Column(name = "phone_number", nullable = false, length = 15)
    private String phoneNumber;

    @NotBlank(message = "Address is required")
    @Size(max = 500, message = "Address must not exceed 500 characters")
    @Column(name = "address", nullable = false, length = 500)
    private String address;

    @Size(max = 100, message = "District must not exceed 100 characters")
    @Column(name = "district", length = 100)
    private String district;

    @Size(max = 100, message = "State must not exceed 100 characters")
    @Column(name = "state", length = 100)
    private String state;

    @NotBlank(message = "Bank account number is required")
    @Size(min = 9, max = 20, message = "Bank account number must be between 9 and 20 digits")
    @Column(name = "bank_account_number", nullable = false, length = 20)
    private String bankAccountNumber;

    @NotBlank(message = "Bank IFSC code is required")
    @Pattern(regexp = "^[A-Z]{4}0[A-Z0-9]{6}$", message = "IFSC code must be valid (e.g. SBIN0001234)")
    @Column(name = "bank_ifsc_code", nullable = false, length = 11)
    private String bankIfscCode;

    @Past(message = "Date of birth must be in the past")
    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @NotNull(message = "Annual income is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Annual income must be a positive value")
    @Digits(integer = 12, fraction = 2, message = "Income format must match up to 12 digits and 2 decimals")
    @Column(name = "annual_income", nullable = false, precision = 14, scale = 2)
    private BigDecimal annualIncome;

    @NotNull(message = "Eligibility status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "eligibility_status", nullable = false, length = 30)
    private VerificationStatus eligibilityStatus;

    @NotNull(message = "Gender is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "gender", nullable = false, length = 10)
    private Gender gender;

    @NotNull(message = "Beneficiary category is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 15)
    private BeneficiaryCategory category;

    @Size(max = 100, message = "Occupation must not exceed 100 characters")
    @Column(name = "occupation", length = 100)
    private String occupation;

    @Size(max = 30, message = "Marital status must not exceed 30 characters")
    @Column(name = "marital_status", length = 30)
    private String maritalStatus;

    @Size(max = 50, message = "Disability status must not exceed 50 characters")
    @Column(name = "disability_status", length = 50)
    private String disabilityStatus;

    @Size(max = 100, message = "House No must not exceed 100 characters")
    @Column(name = "house_no", length = 100)
    private String houseNo;

    @Size(max = 200, message = "Street must not exceed 200 characters")
    @Column(name = "street", length = 200)
    private String street;

    @Size(max = 100, message = "City must not exceed 100 characters")
    @Column(name = "city", length = 100)
    private String city;

    @Size(max = 100, message = "Country must not exceed 100 characters")
    @Column(name = "country", length = 100)
    private String country;

    @Size(max = 20, message = "PIN code must not exceed 20 characters")
    @Column(name = "pin_code", length = 20)
    private String pinCode;

    @Column(name = "family_size")
    private Integer familySize;

    @Size(max = 50, message = "Ration card number must not exceed 50 characters")
    @Column(name = "ration_card_number", length = 50)
    private String rationCardNumber;

    @Size(max = 20, message = "BPL/APL status must not exceed 20 characters")
    @Column(name = "bpl_apl_status", length = 20)
    private String bplAplStatus;

    @Size(max = 150, message = "Account holder name must not exceed 150 characters")
    @Column(name = "account_holder_name", length = 150)
    private String accountHolderName;

    @Size(max = 150, message = "Bank name must not exceed 150 characters")
    @Column(name = "bank_name", length = 150)
    private String bankName;

    @Column(name = "passport_photo_url", columnDefinition = "TEXT")
    private String passportPhotoUrl;

    @Size(max = 100)
    @Column(name = "verified_by", length = 100)
    private String verifiedBy;

    @Column(name = "verified_date")
    private java.time.LocalDateTime verifiedDate;

    @Size(max = 100)
    @Column(name = "rejected_by", length = 100)
    private String rejectedBy;

    @Column(name = "rejected_date")
    private java.time.LocalDateTime rejectedDate;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "approval_remarks", columnDefinition = "TEXT")
    private String approvalRemarks;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Beneficiary that = (Beneficiary) o;
        return Objects.equals(id, that.id) || Objects.equals(uniqueIdNumber, that.uniqueIdNumber);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, uniqueIdNumber);
    }

    @Override
    public String toString() {
        return "Beneficiary{" +
                "id=" + id +
                ", uniqueIdNumber='" + uniqueIdNumber + '\'' +
                ", phoneNumber='" + phoneNumber + '\'' +
                ", eligibilityStatus=" + eligibilityStatus +
                ", gender=" + gender +
                ", category=" + category +
                '}';
    }
}
