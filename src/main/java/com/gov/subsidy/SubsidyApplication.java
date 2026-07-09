package com.gov.subsidy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Entry point for the Government Subsidy Tracking System.
 *
 * <p>{@code @EnableScheduling} activates the {@link com.gov.subsidy.scheduler.WorkflowTimeoutJob}
 * which scans for SLA breaches on a configurable cron schedule.</p>
 */
@SpringBootApplication
@EnableScheduling
public class SubsidyApplication {


    public static void main(String[] args) {
        SpringApplication.run(SubsidyApplication.class, args);
    }
}
