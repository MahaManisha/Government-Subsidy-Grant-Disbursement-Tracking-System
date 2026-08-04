package com.gov.subsidy.service;

import com.gov.subsidy.entity.Application;
import com.gov.subsidy.entity.Scheme;
import com.gov.subsidy.enums.SchemeStatus;
import com.gov.subsidy.exception.SchemeInUseException;
import com.gov.subsidy.mapper.SchemeMapper;
import com.gov.subsidy.repository.ApplicationRepository;
import com.gov.subsidy.repository.SchemeRepository;
import com.gov.subsidy.service.impl.SchemeServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SchemeDeleteIntegrationTest {

    @Mock
    private SchemeRepository schemeRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private SchemeMapper schemeMapper;

    @InjectMocks
    private SchemeServiceImpl schemeService;

    private Scheme schemeInUse;
    private Scheme unusedScheme;

    @BeforeEach
    public void setUp() {
        schemeInUse = Scheme.builder()
                .id(10L)
                .name("Referenced Scheme")
                .code("SCH-REF-10")
                .description("Scheme with active applications")
                .budgetAllocation(new BigDecimal("1000000.00"))
                .remainingBudget(new BigDecimal("1000000.00"))
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusYears(1))
                .active(true)
                .status(SchemeStatus.ACTIVE)
                .build();

        unusedScheme = Scheme.builder()
                .id(20L)
                .name("Unused Test Scheme")
                .code("SCH-UNUSED-20")
                .description("Scheme without applications")
                .budgetAllocation(new BigDecimal("500000.00"))
                .remainingBudget(new BigDecimal("500000.00"))
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusYears(1))
                .active(true)
                .status(SchemeStatus.ACTIVE)
                .build();
    }

    @Test
    @DisplayName("Verify deletion of referenced scheme is blocked and applications remain preserved")
    public void testReferencedSchemeDeleteBlocked_ApplicationsPreserved() {
        when(schemeRepository.findById(10L)).thenReturn(Optional.of(schemeInUse));
        when(applicationRepository.existsBySchemeId(10L)).thenReturn(true);

        assertThrows(SchemeInUseException.class, () -> schemeService.deleteScheme(10L));

        // Verify scheme and applications were NOT deleted
        verify(schemeRepository, never()).delete(any());
        verify(applicationRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Verify deletion of unreferenced scheme succeeds")
    public void testUnreferencedSchemeDelete_Succeeds() {
        when(schemeRepository.findById(20L)).thenReturn(Optional.of(unusedScheme));
        when(applicationRepository.existsBySchemeId(20L)).thenReturn(false);

        assertDoesNotThrow(() -> schemeService.deleteScheme(20L));

        verify(schemeRepository, times(1)).delete(unusedScheme);
    }
}
