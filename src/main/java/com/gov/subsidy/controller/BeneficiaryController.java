package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.BaseResponse;
import com.gov.subsidy.dto.BeneficiaryCreateDto;
import com.gov.subsidy.dto.BeneficiaryDto;
import com.gov.subsidy.dto.UserDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/beneficiaries")
public class BeneficiaryController {

    @PostMapping
    public ResponseEntity<BaseResponse<BeneficiaryDto>> createBeneficiary(@Valid @RequestBody BeneficiaryCreateDto createDto) {
        BeneficiaryDto mockBeneficiary = BeneficiaryDto.builder()
                .id(1L)
                .user(UserDto.builder()
                        .id(createDto.getUserId())
                        .username("citizen_user")
                        .email("citizen@gov.in")
                        .firstName("Citizen")
                        .lastName("One")
                        .active(true)
                        .roles(Collections.singleton("ROLE_BENEFICIARY"))
                        .build())
                .uniqueIdNumber(createDto.getUniqueIdNumber())
                .phoneNumber(createDto.getPhoneNumber())
                .address(createDto.getAddress())
                .bankAccountNumber(createDto.getBankAccountNumber())
                .bankIfscCode(createDto.getBankIfscCode())
                .annualIncome(createDto.getAnnualIncome())
                .eligibilityStatus(createDto.getEligibilityStatus())
                .gender(createDto.getGender())
                .category(createDto.getCategory())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(BaseResponse.success(mockBeneficiary, "Beneficiary profile created successfully"));
    }

    @GetMapping
    public ResponseEntity<BaseResponse<List<BeneficiaryDto>>> getAllBeneficiaries() {
        BeneficiaryDto mockBeneficiary1 = BeneficiaryDto.builder()
                .id(1L)
                .user(UserDto.builder()
                        .id(101L)
                        .username("ram_kumar")
                        .email("ram@gmail.com")
                        .firstName("Ram")
                        .lastName("Kumar")
                        .active(true)
                        .roles(Collections.singleton("ROLE_BENEFICIARY"))
                        .build())
                .uniqueIdNumber("123456789012")
                .phoneNumber("9876543210")
                .address("123, Green Valley, New Delhi")
                .bankAccountNumber("918273645281")
                .bankIfscCode("SBIN0000123")
                .annualIncome(new BigDecimal("150000.00"))
                .eligibilityStatus("VERIFIED")
                .gender("MALE")
                .category("OBC")
                .createdAt(LocalDateTime.now().minusDays(10))
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        BeneficiaryDto mockBeneficiary2 = BeneficiaryDto.builder()
                .id(2L)
                .user(UserDto.builder()
                        .id(102L)
                        .username("rahul_verma")
                        .email("rahul@gmail.com")
                        .firstName("Rahul")
                        .lastName("Verma")
                        .active(true)
                        .roles(Collections.singleton("ROLE_BENEFICIARY"))
                        .build())
                .uniqueIdNumber("987654321098")
                .phoneNumber("8765432109")
                .address("456, Rose Garden, Mumbai")
                .bankAccountNumber("102938475612")
                .bankIfscCode("ICIC0000456")
                .annualIncome(new BigDecimal("450000.00"))
                .eligibilityStatus("PENDING")
                .gender("MALE")
                .category("GENERAL")
                .createdAt(LocalDateTime.now().minusDays(5))
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        List<BeneficiaryDto> mockBeneficiaries = Arrays.asList(mockBeneficiary1, mockBeneficiary2);
        return ResponseEntity.ok(BaseResponse.success(mockBeneficiaries, "Beneficiary list fetched successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<BeneficiaryDto>> getBeneficiaryById(@PathVariable Long id) {
        BeneficiaryDto mockBeneficiary = BeneficiaryDto.builder()
                .id(id)
                .user(UserDto.builder()
                        .id(100L + id)
                        .username("mock_citizen_" + id)
                        .email("mock_citizen" + id + "@gmail.com")
                        .firstName("Citizen")
                        .lastName(id.toString())
                        .active(true)
                        .roles(Collections.singleton("ROLE_BENEFICIARY"))
                        .build())
                .uniqueIdNumber("11112222333" + id)
                .phoneNumber("900000000" + id)
                .address("Mock Address " + id)
                .bankAccountNumber("99999999999" + id)
                .bankIfscCode("HDFC0000111")
                .annualIncome(new BigDecimal("200000.00"))
                .eligibilityStatus("VERIFIED")
                .gender("FEMALE")
                .category("SC")
                .createdAt(LocalDateTime.now().minusDays(10))
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        return ResponseEntity.ok(BaseResponse.success(mockBeneficiary, "Beneficiary details fetched successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<BeneficiaryDto>> updateBeneficiary(@PathVariable Long id, @Valid @RequestBody BeneficiaryCreateDto createDto) {
        BeneficiaryDto mockBeneficiary = BeneficiaryDto.builder()
                .id(id)
                .user(UserDto.builder()
                        .id(createDto.getUserId())
                        .username("citizen_user_updated")
                        .email("citizen_updated@gov.in")
                        .firstName("Citizen")
                        .lastName("Updated")
                        .active(true)
                        .roles(Collections.singleton("ROLE_BENEFICIARY"))
                        .build())
                .uniqueIdNumber(createDto.getUniqueIdNumber())
                .phoneNumber(createDto.getPhoneNumber())
                .address(createDto.getAddress())
                .bankAccountNumber(createDto.getBankAccountNumber())
                .bankIfscCode(createDto.getBankIfscCode())
                .annualIncome(createDto.getAnnualIncome())
                .eligibilityStatus(createDto.getEligibilityStatus())
                .gender(createDto.getGender())
                .category(createDto.getCategory())
                .createdAt(LocalDateTime.now().minusDays(10))
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        return ResponseEntity.ok(BaseResponse.success(mockBeneficiary, "Beneficiary profile updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> deleteBeneficiary(@PathVariable Long id) {
        return ResponseEntity.ok(BaseResponse.success(null, "Beneficiary profile with ID " + id + " deleted successfully"));
    }
}
