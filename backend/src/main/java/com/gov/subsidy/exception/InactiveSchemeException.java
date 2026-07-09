package com.gov.subsidy.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception thrown when an application is submitted for a scheme that is
 * not currently active (i.e. {@code SchemeStatus != ACTIVE} or {@code active == false}).
 */
@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class InactiveSchemeException extends RuntimeException {

    public InactiveSchemeException(String message) {
        super(message);
    }
}
