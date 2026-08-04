package com.gov.subsidy.exception;

import com.gov.subsidy.dto.BaseResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(InactiveSchemeException.class)
    public ResponseEntity<BaseResponse<ErrorDetails>> handleInactiveSchemeException(
            InactiveSchemeException ex, WebRequest request) {
        ErrorDetails details = ErrorDetails.builder()
                .timestamp(LocalDateTime.now())
                .message(ex.getMessage())
                .details(request.getDescription(false))
                .build();
        BaseResponse<ErrorDetails> response = BaseResponse.<ErrorDetails>builder()
                .success(false)
                .message("Scheme is not active")
                .data(details)
                .build();
        return new ResponseEntity<>(response, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<BaseResponse<ErrorDetails>> handleResourceNotFoundException(ResourceNotFoundException ex, WebRequest request) {
        ErrorDetails details = ErrorDetails.builder()
                .timestamp(LocalDateTime.now())
                .message(ex.getMessage())
                .details(request.getDescription(false))
                .build();
        BaseResponse<ErrorDetails> response = BaseResponse.<ErrorDetails>builder()
                .success(false)
                .message("Resource not found")
                .data(details)
                .build();
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(InvalidWorkflowTransitionException.class)
    public ResponseEntity<BaseResponse<ErrorDetails>> handleInvalidWorkflowTransitionException(InvalidWorkflowTransitionException ex, WebRequest request) {
        ErrorDetails details = ErrorDetails.builder()
                .timestamp(LocalDateTime.now())
                .message(ex.getMessage())
                .details(request.getDescription(false))
                .build();
        BaseResponse<ErrorDetails> response = BaseResponse.<ErrorDetails>builder()
                .success(false)
                .message("Invalid workflow state transition")
                .data(details)
                .build();
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<BaseResponse<ErrorDetails>> handleValidationException(MethodArgumentNotValidException ex, WebRequest request) {
        List<String> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.toList());

        ErrorDetails details = ErrorDetails.builder()
                .timestamp(LocalDateTime.now())
                .message("Validation failed")
                .details(request.getDescription(false))
                .validationErrors(errors)
                .build();

        BaseResponse<ErrorDetails> response = BaseResponse.<ErrorDetails>builder()
                .success(false)
                .message("Input validation failed")
                .data(details)
                .build();
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<BaseResponse<ErrorDetails>> handleDuplicateResourceException(DuplicateResourceException ex, WebRequest request) {
        ErrorDetails details = ErrorDetails.builder()
                .timestamp(LocalDateTime.now())
                .message(ex.getMessage())
                .details(request.getDescription(false))
                .build();
        BaseResponse<ErrorDetails> response = BaseResponse.<ErrorDetails>builder()
                .success(false)
                .message("Duplicate resource conflict")
                .data(details)
                .build();
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(SchemeInUseException.class)
    public ResponseEntity<BaseResponse<ErrorDetails>> handleSchemeInUseException(SchemeInUseException ex, WebRequest request) {
        ErrorDetails details = ErrorDetails.builder()
                .status(HttpStatus.CONFLICT.value())
                .error("SCHEME_IN_USE")
                .timestamp(LocalDateTime.now())
                .message(ex.getMessage())
                .details(request.getDescription(false))
                .build();
        BaseResponse<ErrorDetails> response = BaseResponse.<ErrorDetails>builder()
                .success(false)
                .message(ex.getMessage())
                .data(details)
                .build();
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(BeneficiaryHasDependenciesException.class)
    public ResponseEntity<BaseResponse<ErrorDetails>> handleBeneficiaryHasDependenciesException(
            BeneficiaryHasDependenciesException ex, WebRequest request) {
        ErrorDetails details = ErrorDetails.builder()
                .status(HttpStatus.CONFLICT.value())
                .error("BENEFICIARY_HAS_DEPENDENCIES")
                .timestamp(LocalDateTime.now())
                .message(ex.getMessage())
                .details(request.getDescription(false))
                .build();
        BaseResponse<ErrorDetails> response = BaseResponse.<ErrorDetails>builder()
                .success(false)
                .message(ex.getMessage())
                .data(details)
                .build();
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<BaseResponse<ErrorDetails>> handleIllegalArgumentException(IllegalArgumentException ex, WebRequest request) {
        ErrorDetails details = ErrorDetails.builder()
                .timestamp(LocalDateTime.now())
                .message(ex.getMessage())
                .details(request.getDescription(false))
                .build();
        BaseResponse<ErrorDetails> response = BaseResponse.<ErrorDetails>builder()
                .success(false)
                .message("Invalid argument provided")
                .data(details)
                .build();
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<BaseResponse<ErrorDetails>> handleAccessDeniedException(
            org.springframework.security.access.AccessDeniedException ex, WebRequest request) {
        ErrorDetails details = ErrorDetails.builder()
                .timestamp(LocalDateTime.now())
                .message("Access Denied")
                .details(request.getDescription(false))
                .build();
        BaseResponse<ErrorDetails> response = BaseResponse.<ErrorDetails>builder()
                .success(false)
                .message("Forbidden: " + ex.getMessage())
                .data(details)
                .build();
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<BaseResponse<ErrorDetails>> handleNoResourceFoundException(
            org.springframework.web.servlet.resource.NoResourceFoundException ex, WebRequest request) {
        ErrorDetails details = ErrorDetails.builder()
                .timestamp(LocalDateTime.now())
                .message(ex.getMessage())
                .details(request.getDescription(false))
                .build();
        BaseResponse<ErrorDetails> response = BaseResponse.<ErrorDetails>builder()
                .success(false)
                .message("Resource not found")
                .data(details)
                .build();
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<BaseResponse<ErrorDetails>> handleGlobalException(Exception ex, WebRequest request) {
        ErrorDetails details = ErrorDetails.builder()
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .error("INTERNAL_SERVER_ERROR")
                .timestamp(LocalDateTime.now())
                .message(ex.getMessage() != null && !ex.getMessage().isBlank() ? ex.getMessage() : "Unable to load the requested information.")
                .details(request.getDescription(false))
                .build();
        BaseResponse<ErrorDetails> response = BaseResponse.<ErrorDetails>builder()
                .success(false)
                .message("Unable to load the requested information.")
                .data(details)
                .build();
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
