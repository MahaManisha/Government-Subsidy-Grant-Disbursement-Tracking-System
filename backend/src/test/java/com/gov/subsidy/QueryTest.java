package com.gov.subsidy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;
import java.util.Map;

@SpringBootTest
public class QueryTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    public void testQueryApp() {
        String appSql = "SELECT id, application_number, workflow_status, current_stage, eligibility_score, eligibility_result, rejection_reason, assigned_officer_id FROM applications LIMIT 1";
        List<Map<String, Object>> apps = jdbcTemplate.queryForList(appSql);
        if (!apps.isEmpty()) {
            Map<String, Object> app = apps.get(0);
            long appId = ((Number) app.get("id")).longValue();
            System.out.println("========== APP-DB-SNAPSHOT ==========");
            System.out.println("Application ID: " + appId);
            System.out.println("Status: " + app.get("workflow_status"));
            System.out.println("Stage: " + app.get("current_stage"));
            System.out.println("Score: " + app.get("eligibility_score"));
            System.out.println("Eligibility Result: " + app.get("eligibility_result"));
            System.out.println("Rejection Reason: " + app.get("rejection_reason"));
            System.out.println("Assigned Officer ID: " + app.get("assigned_officer_id"));

            String verSql = "SELECT id, status, remarks FROM verifications WHERE application_id = " + appId;
            List<Map<String, Object>> vers = jdbcTemplate.queryForList(verSql);
            if (!vers.isEmpty()) {
                System.out.println("Verification ID: " + vers.get(0).get("id") + ", Status: " + vers.get(0).get("status") + ", Remarks: " + vers.get(0).get("remarks"));
            } else {
                System.out.println("No Verification record found.");
            }

            String auditSql = "SELECT event as action, from_status as previous_status, to_status as new_status, description as remarks FROM workflow_audit_logs WHERE application_id = " + appId + " ORDER BY occurred_at ASC";
            List<Map<String, Object>> audits = jdbcTemplate.queryForList(auditSql);
            for (Map<String, Object> audit : audits) {
                System.out.println("Audit Log - Action: " + audit.get("action") + 
                    ", Prev: " + audit.get("previous_status") + 
                    ", New: " + audit.get("new_status") + 
                    ", Remarks: " + audit.get("remarks"));
            }
            System.out.println("=====================================");
        } else {
            System.out.println("APP-DB-SNAPSHOT not found!");
        }
    }
}
