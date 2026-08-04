package com.gov.subsidy.exception;

/**
 * Exception thrown when an attempt is made to delete a scheme
 * that is currently referenced by one or more beneficiary applications.
 */
public class SchemeInUseException extends RuntimeException {

    public SchemeInUseException(String message) {
        super(message);
    }
}
