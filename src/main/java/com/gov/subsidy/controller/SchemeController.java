package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.BaseResponse;
import com.gov.subsidy.dto.SchemeCreateDto;
import com.gov.subsidy.dto.SchemeDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/schemes")
public class SchemeController {

    @PostMapping
    public ResponseEntity<BaseResponse<SchemeDto>> createScheme(@Valid @RequestBody SchemeCreateDto createDto) {
        SchemeDto mockScheme = SchemeDto.builder()
                .id(1L)
                .name(createDto.getName())
                .code(createDto.getCode())
                .description(createDto.getDescription())
                .budgetAllocation(createDto.getBudgetAllocation())
                .remainingBudget(createDto.getBudgetAllocation())
                .startDate(createDto.getStartDate())
                .endDate(createDto.getEndDate())
                .active(true)
                .status(createDto.getStatus())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(BaseResponse.success(mockScheme, "Scheme created successfully"));
    }

    @GetMapping
    public ResponseEntity<BaseResponse<List<SchemeDto>>> getAllSchemes() {
        SchemeDto mockScheme1 = SchemeDto.builder()
                .id(1L)
                .name("Pradhan Mantri Fasal Bima Yojana")
                .code("PMFBY-2026")
                .description("Crop insurance scheme for farmers to provide financial support in case of crop failures.")
                .budgetAllocation(new BigDecimal("50000000.00"))
                .remainingBudget(new BigDecimal("42000000.00"))
                .startDate(LocalDate.of(2026, 6, 1))
                .endDate(LocalDate.of(2027, 6, 1))
                .active(true)
                .status("ACTIVE")
                .createdAt(LocalDateTime.now().minusMonths(1))
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        SchemeDto mockScheme2 = SchemeDto.builder()
                .id(2L)
                .name("National Fellowship for Higher Education")
                .code("NFHE-2026")
                .description("Financial grants for marginalized students pursuing higher education.")
                .budgetAllocation(new BigDecimal("15000000.00"))
                .remainingBudget(new BigDecimal("15000000.00"))
                .startDate(LocalDate.of(2026, 7, 1))
                .endDate(LocalDate.of(2027, 7, 1))
                .active(true)
                .status("ACTIVE")
                .createdAt(LocalDateTime.now().minusDays(15))
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        List<SchemeDto> mockSchemes = Arrays.asList(mockScheme1, mockScheme2);
        return ResponseEntity.ok(BaseResponse.success(mockSchemes, "Schemes fetched successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<SchemeDto>> getSchemeById(@PathVariable Long id) {
        SchemeDto mockScheme = SchemeDto.builder()
                .id(id)
                .name("Mock Grant Scheme " + id)
                .code("MOCK-CODE-" + id)
                .description("Detailed description for mock government grant scheme ID " + id)
                .budgetAllocation(new BigDecimal("10000000.00"))
                .remainingBudget(new BigDecimal("8000000.00"))
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusYears(1))
                .active(true)
                .status("ACTIVE")
                .createdAt(LocalDateTime.now().minusDays(30))
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        return ResponseEntity.ok(BaseResponse.success(mockScheme, "Scheme details fetched successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<SchemeDto>> updateScheme(@PathVariable Long id, @Valid @RequestBody SchemeCreateDto createDto) {
        SchemeDto mockScheme = SchemeDto.builder()
                .id(id)
                .name(createDto.getName())
                .code(createDto.getCode())
                .description(createDto.getDescription())
                .budgetAllocation(createDto.getBudgetAllocation())
                .remainingBudget(createDto.getBudgetAllocation().subtract(new BigDecimal("5000.00")))
                .startDate(createDto.getStartDate())
                .endDate(createDto.getEndDate())
                .active(true)
                .status(createDto.getStatus())
                .createdAt(LocalDateTime.now().minusDays(30))
                .updatedAt(LocalDateTime.now())
                .createdBy("SYSTEM")
                .updatedBy("SYSTEM")
                .build();

        return ResponseEntity.ok(BaseResponse.success(mockScheme, "Scheme updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> deleteScheme(@PathVariable Long id) {
        return ResponseEntity.ok(BaseResponse.success(null, "Scheme with ID " + id + " archived successfully"));
    }
}
