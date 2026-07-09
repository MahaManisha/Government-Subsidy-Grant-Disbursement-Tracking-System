package com.gov.subsidy.mapper;

import com.gov.subsidy.dto.BeneficiaryCreateDto;
import com.gov.subsidy.dto.BeneficiaryDto;
import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.enums.BeneficiaryCategory;
import com.gov.subsidy.enums.Gender;
import com.gov.subsidy.enums.VerificationStatus;
import org.springframework.stereotype.Component;

@Component
public class BeneficiaryMapper implements GenericMapper<Beneficiary, BeneficiaryDto> {

    private final UserMapper userMapper;

    public BeneficiaryMapper(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    @Override
    public BeneficiaryDto toDto(Beneficiary entity) {
        if (entity == null) {
            return null;
        }

        return BeneficiaryDto.builder()
                .id(entity.getId())
                .user(userMapper.toDto(entity.getUser()))
                .uniqueIdNumber(entity.getUniqueIdNumber())
                .phoneNumber(entity.getPhoneNumber())
                .address(entity.getAddress())
                .bankAccountNumber(entity.getBankAccountNumber())
                .bankIfscCode(entity.getBankIfscCode())
                .annualIncome(entity.getAnnualIncome())
                .dateOfBirth(entity.getDateOfBirth())
                .eligibilityStatus(entity.getEligibilityStatus() == null ? null : entity.getEligibilityStatus().name())
                .gender(entity.getGender() == null ? null : entity.getGender().name())
                .category(entity.getCategory() == null ? null : entity.getCategory().name())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }

    @Override
    public Beneficiary toEntity(BeneficiaryDto dto) {
        if (dto == null) {
            return null;
        }

        Beneficiary beneficiary = Beneficiary.builder()
                .id(dto.getId())
                .user(userMapper.toEntity(dto.getUser()))
                .uniqueIdNumber(dto.getUniqueIdNumber())
                .phoneNumber(dto.getPhoneNumber())
                .address(dto.getAddress())
                .bankAccountNumber(dto.getBankAccountNumber())
                .bankIfscCode(dto.getBankIfscCode())
                .annualIncome(dto.getAnnualIncome())
                .dateOfBirth(dto.getDateOfBirth())
                .eligibilityStatus(dto.getEligibilityStatus() == null ? null : 
                        VerificationStatus.valueOf(dto.getEligibilityStatus()))
                .gender(dto.getGender() == null ? null : Gender.valueOf(dto.getGender()))
                .category(dto.getCategory() == null ? null : BeneficiaryCategory.valueOf(dto.getCategory()))
                .build();

        beneficiary.setCreatedAt(dto.getCreatedAt());
        beneficiary.setUpdatedAt(dto.getUpdatedAt());
        beneficiary.setCreatedBy(dto.getCreatedBy());
        beneficiary.setUpdatedBy(dto.getUpdatedBy());
        return beneficiary;
    }

    public Beneficiary toEntity(BeneficiaryCreateDto createDto) {
        if (createDto == null) {
            return null;
        }

        return Beneficiary.builder()
                .uniqueIdNumber(createDto.getUniqueIdNumber())
                .phoneNumber(createDto.getPhoneNumber())
                .address(createDto.getAddress())
                .bankAccountNumber(createDto.getBankAccountNumber())
                .bankIfscCode(createDto.getBankIfscCode())
                .annualIncome(createDto.getAnnualIncome())
                .dateOfBirth(createDto.getDateOfBirth())
                .eligibilityStatus(createDto.getEligibilityStatus() == null ? null : 
                        VerificationStatus.valueOf(createDto.getEligibilityStatus()))
                .gender(createDto.getGender() == null ? null : Gender.valueOf(createDto.getGender()))
                .category(createDto.getCategory() == null ? null : BeneficiaryCategory.valueOf(createDto.getCategory()))
                .build();
    }
}
