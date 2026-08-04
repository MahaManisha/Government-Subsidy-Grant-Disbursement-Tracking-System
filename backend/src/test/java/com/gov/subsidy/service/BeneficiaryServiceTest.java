package com.gov.subsidy.service;

import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.exception.BeneficiaryHasDependenciesException;
import com.gov.subsidy.exception.ResourceNotFoundException;
import com.gov.subsidy.mapper.BeneficiaryMapper;
import com.gov.subsidy.repository.ApplicationDocumentRepository;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.BeneficiaryRepository;
import com.gov.subsidy.repository.ComplianceRepository;
import com.gov.subsidy.repository.FundUtilizationRepository;
import com.gov.subsidy.repository.UserRepository;
import com.gov.subsidy.service.impl.BeneficiaryServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class BeneficiaryServiceTest {

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

    @InjectMocks
    private BeneficiaryServiceImpl beneficiaryService;

    private Beneficiary testBeneficiary;

    @BeforeEach
    public void setUp() {
        testBeneficiary = Beneficiary.builder()
                .id(1L)
                .uniqueIdNumber("123456789012")
                .phoneNumber("9876543210")
                .address("Test Address")
                .bankAccountNumber("918273645281")
                .bankIfscCode("SBIN0001234")
                .build();
    }

    @Test
    @DisplayName("Delete beneficiary with 0 dependent records should succeed")
    public void testDeleteBeneficiary_NoDependencies_Success() {
        when(beneficiaryRepository.findById(1L)).thenReturn(Optional.of(testBeneficiary));
        when(applicationRepository.existsByBeneficiaryId(1L)).thenReturn(false);
        when(applicationDocumentRepository.existsByBeneficiaryId(1L)).thenReturn(false);
        when(complianceRepository.existsByBeneficiaryId(1L)).thenReturn(false);
        when(fundUtilizationRepository.existsByBeneficiaryId(1L)).thenReturn(false);

        assertDoesNotThrow(() -> beneficiaryService.deleteBeneficiary(1L));

        verify(beneficiaryRepository, times(1)).delete(testBeneficiary);
    }

    @Test
    @DisplayName("Delete beneficiary with application dependency should throw BeneficiaryHasDependenciesException")
    public void testDeleteBeneficiary_WithApplicationDependency_ThrowsException() {
        when(beneficiaryRepository.findById(1L)).thenReturn(Optional.of(testBeneficiary));
        when(applicationRepository.existsByBeneficiaryId(1L)).thenReturn(true);

        BeneficiaryHasDependenciesException ex = assertThrows(
                BeneficiaryHasDependenciesException.class,
                () -> beneficiaryService.deleteBeneficiary(1L)
        );

        assertTrue(ex.getMessage().contains("cannot be permanently deleted because application or verification records exist"));
        verify(beneficiaryRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Delete non-existent beneficiary should throw ResourceNotFoundException")
    public void testDeleteBeneficiary_NotFound_ThrowsException() {
        when(beneficiaryRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> beneficiaryService.deleteBeneficiary(999L));
    }
}
