package com.gov.subsidy.service;

import com.gov.subsidy.dto.FundUtilizationDto;
import com.gov.subsidy.dto.FundUtilizationRequestDto;
import com.gov.subsidy.dto.FundUtilizationSummaryDto;
import com.gov.subsidy.dto.FundUtilizationVerificationDto;
import com.gov.subsidy.enums.VerificationStatus;

public interface FundUtilizationService {
    FundUtilizationDto submitUtilization(FundUtilizationRequestDto request);
    FundUtilizationDto getUtilizationDetails(Long id);
    FundUtilizationDto verifyUtilization(Long id, VerificationStatus status, FundUtilizationVerificationDto request);
    FundUtilizationSummaryDto getUtilizationSummary(Long applicationId);
}
