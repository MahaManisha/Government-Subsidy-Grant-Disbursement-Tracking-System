package com.gov.subsidy.service;

import com.gov.subsidy.dto.SchemeDto;
import com.gov.subsidy.entity.Scheme;
import com.gov.subsidy.enums.SchemeStatus;
import com.gov.subsidy.exception.ResourceNotFoundException;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SchemeServiceTest {

    @Mock
    private SchemeRepository schemeRepository;

    @Mock
    private SchemeMapper schemeMapper;

    @Mock
    private ApplicationRepository applicationRepository;

    @InjectMocks
    private SchemeServiceImpl schemeService;

    private Scheme testScheme;

    @BeforeEach
    public void setUp() {
        testScheme = Scheme.builder()
                .id(1L)
                .name("PM-KISAN Agri Machinery Subsidy")
                .code("PM-AGRI-2026")
                .description("Subsidized agricultural machinery")
                .budgetAllocation(new BigDecimal("5000000.00"))
                .remainingBudget(new BigDecimal("5000000.00"))
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .active(true)
                .status(SchemeStatus.ACTIVE)
                .build();
    }

    @Test
    @DisplayName("Delete scheme with 0 applications should succeed")
    public void testDeleteScheme_NoApplications_Success() {
        when(schemeRepository.findById(1L)).thenReturn(Optional.of(testScheme));
        when(applicationRepository.existsBySchemeId(1L)).thenReturn(false);

        assertDoesNotThrow(() -> schemeService.deleteScheme(1L));

        verify(schemeRepository, times(1)).delete(testScheme);
    }

    @Test
    @DisplayName("Delete scheme referenced by applications should throw SchemeInUseException")
    public void testDeleteScheme_ReferencedByApplications_ThrowsException() {
        when(schemeRepository.findById(1L)).thenReturn(Optional.of(testScheme));
        when(applicationRepository.existsBySchemeId(1L)).thenReturn(true);

        SchemeInUseException ex = assertThrows(
                SchemeInUseException.class,
                () -> schemeService.deleteScheme(1L)
        );

        assertTrue(ex.getMessage().contains("Cannot delete this scheme because it is associated with existing beneficiary applications"));
        verify(schemeRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Deactivate scheme should set active=false and status=INACTIVE")
    public void testDeactivateScheme_Success() {
        SchemeDto expectedDto = SchemeDto.builder()
                .id(1L)
                .name("PM-KISAN Agri Machinery Subsidy")
                .code("PM-AGRI-2026")
                .active(false)
                .status("INACTIVE")
                .build();

        when(schemeRepository.findById(1L)).thenReturn(Optional.of(testScheme));
        when(schemeRepository.save(any(Scheme.class))).thenReturn(testScheme);
        when(schemeMapper.toDto(any(Scheme.class))).thenReturn(expectedDto);

        SchemeDto result = schemeService.deactivateScheme(1L);

        assertNotNull(result);
        assertFalse(result.isActive());
        assertEquals("INACTIVE", result.getStatus());
        verify(schemeRepository, times(1)).save(testScheme);
    }

    @Test
    @DisplayName("Delete non-existent scheme should throw ResourceNotFoundException")
    public void testDeleteScheme_NotFound_ThrowsException() {
        when(schemeRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> schemeService.deleteScheme(999L));
    }
}
