package com.gov.subsidy.service;

import com.gov.subsidy.dto.BeneficiaryDto;
import com.gov.subsidy.entity.AuditLog;
import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.enums.BeneficiaryCategory;
import com.gov.subsidy.enums.Gender;
import com.gov.subsidy.enums.VerificationStatus;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.BeneficiaryMapper;
import com.gov.subsidy.repository.ApplicationDocumentRepository;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.AuditLogRepository;
import com.gov.subsidy.repository.BeneficiaryRepository;
import com.gov.subsidy.repository.ComplianceRepository;
import com.gov.subsidy.repository.FundUtilizationRepository;
import com.gov.subsidy.repository.UserRepository;
import com.gov.subsidy.service.impl.BeneficiaryServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class BeneficiaryApprovalTest {

    @Mock
    private BeneficiaryRepository beneficiaryRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BeneficiaryMapper beneficiaryMapper;
    @Mock
    private ApplicationRepository applicationRepository;
    @Mock
    private ApplicationDocumentRepository applicationDocumentRepository;
    @Mock
    private ComplianceRepository complianceRepository;
    @Mock
    private FundUtilizationRepository fundUtilizationRepository;
    @Mock
    private AuditLogRepository auditLogRepository;
    @Mock
    private EmailService emailService;

    private BeneficiaryServiceImpl beneficiaryService;
    private Beneficiary testBeneficiary;
    private BeneficiaryDto testBeneficiaryDto;

    @BeforeEach
    void setUp() {
        beneficiaryService = new BeneficiaryServiceImpl(
                beneficiaryRepository,
                userRepository,
                beneficiaryMapper,
                applicationRepository,
                applicationDocumentRepository,
                complianceRepository,
                fundUtilizationRepository,
                auditLogRepository,
                emailService
        );

        testBeneficiary = Beneficiary.builder()
                .id(1L)
                .uniqueIdNumber("123456789012")
                .phoneNumber("9876543210")
                .address("123 Gandhi Street, Madurai, TN")
                .bankAccountNumber("918273645281")
                .bankIfscCode("SBIN0001234")
                .dateOfBirth(LocalDate.of(1990, 5, 15))
                .annualIncome(new BigDecimal("150000.00"))
                .eligibilityStatus(VerificationStatus.PENDING)
                .gender(Gender.MALE)
                .category(BeneficiaryCategory.OBC)
                .build();

        testBeneficiaryDto = BeneficiaryDto.builder()
                .id(1L)
                .uniqueIdNumber("123456789012")
                .phoneNumber("9876543210")
                .eligibilityStatus("VERIFIED")
                .build();
    }

    @Test
    @DisplayName("Approve Beneficiary transitions status to VERIFIED and records AuditLog")
    void testApproveBeneficiary_Success() {
        when(beneficiaryRepository.findById(1L)).thenReturn(Optional.of(testBeneficiary));
        when(beneficiaryRepository.save(any(Beneficiary.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(beneficiaryMapper.toDto(any(Beneficiary.class))).thenReturn(testBeneficiaryDto);

        BeneficiaryDto result = beneficiaryService.approveBeneficiary(1L, "Documents verified cleanly", "admin_user");

        assertThat(testBeneficiary.getEligibilityStatus()).isEqualTo(VerificationStatus.VERIFIED);
        assertThat(testBeneficiary.getVerifiedBy()).isEqualTo("admin_user");
        assertThat(testBeneficiary.getVerifiedDate()).isNotNull();
        assertThat(testBeneficiary.getApprovalRemarks()).isEqualTo("Documents verified cleanly");

        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("Reject Beneficiary transitions status to REJECTED with reason")
    void testRejectBeneficiary_Success() {
        when(beneficiaryRepository.findById(1L)).thenReturn(Optional.of(testBeneficiary));
        when(beneficiaryRepository.save(any(Beneficiary.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(beneficiaryMapper.toDto(any(Beneficiary.class))).thenReturn(testBeneficiaryDto);

        BeneficiaryDto result = beneficiaryService.rejectBeneficiary(1L, "Aadhaar mismatch", "admin_user");

        assertThat(testBeneficiary.getEligibilityStatus()).isEqualTo(VerificationStatus.REJECTED);
        assertThat(testBeneficiary.getRejectedBy()).isEqualTo("admin_user");
        assertThat(testBeneficiary.getRejectedDate()).isNotNull();
        assertThat(testBeneficiary.getRejectionReason()).isEqualTo("Aadhaar mismatch");

        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("Request Changes transitions status to CHANGES_REQUIRED")
    void testRequestChanges_Success() {
        when(beneficiaryRepository.findById(1L)).thenReturn(Optional.of(testBeneficiary));
        when(beneficiaryRepository.save(any(Beneficiary.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(beneficiaryMapper.toDto(any(Beneficiary.class))).thenReturn(testBeneficiaryDto);

        BeneficiaryDto result = beneficiaryService.requestChanges(1L, "Upload valid income certificate", "admin_user");

        assertThat(testBeneficiary.getEligibilityStatus()).isEqualTo(VerificationStatus.CHANGES_REQUIRED);
        assertThat(testBeneficiary.getApprovalRemarks()).isEqualTo("Upload valid income certificate");

        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("Resubmit Beneficiary resets status to PENDING")
    void testResubmitBeneficiary_Success() {
        testBeneficiary.setEligibilityStatus(VerificationStatus.CHANGES_REQUIRED);
        when(beneficiaryRepository.findById(1L)).thenReturn(Optional.of(testBeneficiary));
        when(beneficiaryRepository.save(any(Beneficiary.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(beneficiaryMapper.toDto(any(Beneficiary.class))).thenReturn(testBeneficiaryDto);

        BeneficiaryDto result = beneficiaryService.resubmitBeneficiary(1L);

        assertThat(testBeneficiary.getEligibilityStatus()).isEqualTo(VerificationStatus.PENDING);
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("Reject throws IllegalArgumentException when reason is empty")
    void testRejectBeneficiary_EmptyReason_ThrowsException() {
        when(beneficiaryRepository.findById(1L)).thenReturn(Optional.of(testBeneficiary));

        assertThatThrownBy(() -> beneficiaryService.rejectBeneficiary(1L, "", "admin_user"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Rejection reason is required");
    }
}
