package com.gov.subsidy.service;

public interface EmailService {
    void sendEmail(String toEmail, String subject, String body);
}
