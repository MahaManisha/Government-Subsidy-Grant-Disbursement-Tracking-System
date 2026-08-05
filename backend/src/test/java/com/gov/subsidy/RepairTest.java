package com.gov.subsidy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import com.gov.subsidy.service.RoutingService;

@SpringBootTest
public class RepairTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    @Autowired
    private RoutingService routingService;

    @Test
    public void testRepairApp() {
        System.out.println("Repairing APP-2026-000004...");
        // Reset status to SUBMITTED
        jdbcTemplate.update("UPDATE applications SET workflow_status = 'SUBMITTED', current_stage = 'INITIATION', eligibility_result = 'ELIGIBLE', rejection_reason = NULL WHERE application_number = 'APP-2026-000004'");
        
        // Find ID
        Long id = jdbcTemplate.queryForObject("SELECT id FROM applications WHERE application_number = 'APP-2026-000004'", Long.class);
        
        System.out.println("Routing APP-2026-000004 (ID: " + id + ") through the standard engine...");
        routingService.routeApplication(id);
        
        System.out.println("Repaired successfully!");
    }
}
