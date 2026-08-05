package com.gov.subsidy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import com.gov.subsidy.dto.ApplicationDto;
import com.gov.subsidy.dto.ApplicationCreateDto;
import com.gov.subsidy.service.ApplicationService;
import com.gov.subsidy.repository.VerificationRepository;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
public class SubmitApplicationTest {

    @Autowired
    private ApplicationService applicationService;

    @Autowired
    private VerificationRepository verificationRepository;

    @Autowired
    private com.gov.subsidy.repository.BeneficiaryRepository beneficiaryRepository;

    @Autowired
    private com.gov.subsidy.repository.ApplicationRepository applicationRepository;

    @Test
    public void testSubmitApplication() {
        System.out.println("Submitting new test application...");
        ApplicationCreateDto dto = new ApplicationCreateDto();
        // Fetch any valid Beneficiary dynamically who hasn't applied to Scheme 1
        Long validBeneficiaryId = beneficiaryRepository.findAll().stream()
            .map(b -> b.getId())
            .filter(id -> applicationRepository.findByBeneficiaryId(id).stream()
                          .noneMatch(app -> app.getScheme().getId().equals(1L)))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("No eligible beneficiary found in DB for scheme 1"));
        
        dto.setBeneficiaryId(validBeneficiaryId); 
        dto.setSchemeId(1L); // Active Scheme
        dto.setRequestedAmount(java.math.BigDecimal.valueOf(4000));
        dto.setPriorityTier("MEDIUM"); // Set a valid priority
        
        ApplicationDto result = applicationService.submitApplication(dto);
        
        System.out.println("Result Status: " + result.getWorkflowStatus());
        System.out.println("Result Stage: " + result.getCurrentStage());
        System.out.println("Assigned Officer ID: " + (result.getAssignedOfficer() != null ? result.getAssignedOfficer().getId() : "null"));
        
        // It should NOT be ELIGIBILITY_REJECTED anymore
        assertEquals("UNDER_REVIEW", result.getWorkflowStatus());
        assertEquals("FIELD_VERIFICATION", result.getCurrentStage());
        
        assertNotNull(result.getAssignedOfficer(), "Field officer should be assigned");
        
        boolean hasVerification = verificationRepository.findByApplicationId(result.getId()).isPresent();
        System.out.println("Has Verification record: " + hasVerification);
        assertEquals(true, hasVerification);
    }
}
