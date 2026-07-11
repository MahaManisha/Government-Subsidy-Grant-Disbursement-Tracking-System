package com.gov.subsidy.service.impl;

import com.gov.subsidy.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class EmailServiceImpl implements EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    @Override
    public void sendEmail(String toEmail, String subject, String body) {
        log.info("[SIMULATED EMAIL] Sent to: {} | Subject: {} | Body: {}", toEmail, subject, body);
    }
}
