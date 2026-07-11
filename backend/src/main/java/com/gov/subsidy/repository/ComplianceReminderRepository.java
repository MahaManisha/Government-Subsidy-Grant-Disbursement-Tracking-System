package com.gov.subsidy.repository;

import com.gov.subsidy.entity.ComplianceReminder;
import com.gov.subsidy.enums.ComplianceReminderType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ComplianceReminderRepository extends JpaRepository<ComplianceReminder, Long> {
    List<ComplianceReminder> findByComplianceId(Long complianceId);
    boolean existsByComplianceIdAndReminderType(Long complianceId, ComplianceReminderType reminderType);
}
