package com.gov.subsidy.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception thrown when an attempt is made to create a resource
 * that violates a uniqueness constraint (e.g. duplicate Aadhaar number,
 * duplicate mobile number, duplicate bank account number).
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class DuplicateResourceException extends RuntimeException {

    public DuplicateResourceException(String message) {
        super(message);
    }
}
