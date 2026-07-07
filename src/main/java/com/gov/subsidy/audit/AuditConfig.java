package com.gov.subsidy.audit;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import java.util.Optional;

@Configuration
@EnableJpaAuditing
public class AuditConfig {

    @Bean
    public AuditorAware<String> auditorProvider() {
        // Return a mock user for now, which will write "SYSTEM" to created_by and updated_by.
        // In Milestone 2, this can be integrated with Spring Security context.
        return () -> Optional.of("SYSTEM");
    }
}
