package com.gov.subsidy.service;

import com.gov.subsidy.dto.ComplianceDto;
import com.gov.subsidy.dto.ComplianceRequestDto;
import com.gov.subsidy.dto.ComplianceUpdateDto;

import java.util.List;

public interface ComplianceService {
    ComplianceDto createComplianceRecord(ComplianceRequestDto request);
    ComplianceDto getComplianceDetails(Long id);
    ComplianceDto updateCompliance(Long id, ComplianceUpdateDto request);
    ComplianceDto approveCompliance(Long id);
    ComplianceDto rejectCompliance(Long id, String reason);
    List<ComplianceDto> getCompliancesByApplication(Long applicationId);
}
