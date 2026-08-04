package com.gov.subsidy.bootstrap;

import com.gov.subsidy.entity.Application;
import com.gov.subsidy.entity.Beneficiary;
import com.gov.subsidy.entity.DisbursementPlan;
import com.gov.subsidy.entity.Verification;
import com.gov.subsidy.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Startup component to perform targeted cleanup of seeded dummy beneficiary data
 * (Aadhaar 123456789012) and its associated child dependency records.
 */
@Component
@Order(2)
public class DummyDataCleaner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DummyDataCleaner.class);

    private final BeneficiaryRepository beneficiaryRepository;
    private final ApplicationRepository applicationRepository;
    private final ApplicationDocumentRepository applicationDocumentRepository;
    private final VerificationRepository verificationRepository;
    private final VerificationHistoryRepository verificationHistoryRepository;
    private final WorkflowAuditLogRepository workflowAuditLogRepository;
    private final DisbursementPlanRepository disbursementPlanRepository;
    private final DisbursementMilestoneRepository disbursementMilestoneRepository;
    private final DisbursementRepository disbursementRepository;
    private final ComplianceRepository complianceRepository;
    private final FundUtilizationRepository fundUtilizationRepository;
    private final RoutingRecordRepository routingRecordRepository;
    private final UserRepository userRepository;

    public DummyDataCleaner(BeneficiaryRepository beneficiaryRepository,
                            ApplicationRepository applicationRepository,
                            ApplicationDocumentRepository applicationDocumentRepository,
                            VerificationRepository verificationRepository,
                            VerificationHistoryRepository verificationHistoryRepository,
                            WorkflowAuditLogRepository workflowAuditLogRepository,
                            DisbursementPlanRepository disbursementPlanRepository,
                            DisbursementMilestoneRepository disbursementMilestoneRepository,
                            DisbursementRepository disbursementRepository,
                            ComplianceRepository complianceRepository,
                            FundUtilizationRepository fundUtilizationRepository,
                            RoutingRecordRepository routingRecordRepository,
                            UserRepository userRepository) {
        this.beneficiaryRepository = beneficiaryRepository;
        this.applicationRepository = applicationRepository;
        this.applicationDocumentRepository = applicationDocumentRepository;
        this.verificationRepository = verificationRepository;
        this.verificationHistoryRepository = verificationHistoryRepository;
        this.workflowAuditLogRepository = workflowAuditLogRepository;
        this.disbursementPlanRepository = disbursementPlanRepository;
        this.disbursementMilestoneRepository = disbursementMilestoneRepository;
        this.disbursementRepository = disbursementRepository;
        this.complianceRepository = complianceRepository;
        this.fundUtilizationRepository = fundUtilizationRepository;
        this.routingRecordRepository = routingRecordRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        String dummyAadhaar = "123456789012";
        Optional<Beneficiary> dummyBenOpt = beneficiaryRepository.findByUniqueIdNumber(dummyAadhaar);

        if (dummyBenOpt.isEmpty()) {
            log.info("[DummyDataCleaner] No dummy beneficiary with Aadhaar '{}' found. Database is clean.", dummyAadhaar);
            return;
        }

        Beneficiary dummyBen = dummyBenOpt.get();
        Long benId = dummyBen.getId();
        log.info("[DummyDataCleaner] Target dummy beneficiary found with ID: {}, Aadhaar: {}", benId, dummyAadhaar);

        // Find applications for this dummy beneficiary
        List<Application> apps = applicationRepository.findByBeneficiaryId(benId);
        log.info("[DummyDataCleaner] Found {} dependent application(s) for dummy beneficiary ID {}", apps.size(), benId);

        for (Application app : apps) {
            Long appId = app.getId();
            log.info("[DummyDataCleaner] Cleaning child records for Application ID {}", appId);

            // Clean verification & history
            Optional<Verification> verificationOpt = verificationRepository.findByApplicationId(appId);
            if (verificationOpt.isPresent()) {
                Verification v = verificationOpt.get();
                verificationHistoryRepository.deleteAll(verificationHistoryRepository.findByVerificationIdOrderByActionDateAsc(v.getId()));
                verificationRepository.delete(v);
            }

            // Clean workflow logs
            workflowAuditLogRepository.deleteAll(workflowAuditLogRepository.findByApplicationIdOrderByOccurredAtAsc(appId));

            // Clean docs
            applicationDocumentRepository.deleteAll(applicationDocumentRepository.findByApplicationId(appId));

            // Clean disbursement plan & milestones
            Optional<DisbursementPlan> planOpt = disbursementPlanRepository.findByApplicationId(appId);
            if (planOpt.isPresent()) {
                DisbursementPlan plan = planOpt.get();
                disbursementMilestoneRepository.deleteAll(disbursementMilestoneRepository.findByDisbursementPlanIdOrderByMilestoneNumberAsc(plan.getId()));
                disbursementPlanRepository.delete(plan);
            }

            // Clean disbursements
            disbursementRepository.deleteAll(disbursementRepository.findByApplicationId(appId));

            // Clean compliance & fund utilization
            complianceRepository.deleteAll(complianceRepository.findByApplicationId(appId));
            fundUtilizationRepository.deleteAll(fundUtilizationRepository.findByApplicationId(appId));

            // Clean routing records
            routingRecordRepository.deleteAll(routingRecordRepository.findByApplicationIdOrderByRoutedAtAsc(appId));

            // Delete application
            applicationRepository.delete(app);
            log.info("[DummyDataCleaner] Deleted Application ID {}", appId);
        }

        // Clean any direct beneficiary-linked records
        applicationDocumentRepository.deleteAll(applicationDocumentRepository.findByBeneficiaryId(benId));
        complianceRepository.deleteAll(complianceRepository.findByBeneficiaryId(benId));
        fundUtilizationRepository.deleteAll(fundUtilizationRepository.findByBeneficiaryId(benId));

        // Delete the dummy beneficiary itself
        beneficiaryRepository.delete(dummyBen);
        log.info("[DummyDataCleaner] Successfully deleted dummy beneficiary ID {} ('Unlinked Citizen')", benId);

        // Delete dummy user account if present
        userRepository.findByUsername("beneficiary_demo").ifPresent(user -> {
            userRepository.delete(user);
            log.info("[DummyDataCleaner] Deleted dummy user account 'beneficiary_demo'");
        });
    }
}
