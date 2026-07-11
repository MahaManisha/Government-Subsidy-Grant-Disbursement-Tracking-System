package com.gov.subsidy.service.impl;

import com.gov.subsidy.service.SmsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class SmsServiceImpl implements SmsService {
    private static final Logger log = LoggerFactory.getLogger(SmsServiceImpl.class);

    @Override
    public void sendSms(String phoneNumber, String message) {
        log.info("[SIMULATED SMS] Sent to: {} | Message: {}", phoneNumber, message);
    }
}
