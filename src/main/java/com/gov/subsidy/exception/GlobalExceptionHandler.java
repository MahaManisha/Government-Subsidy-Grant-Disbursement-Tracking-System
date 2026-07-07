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

    @ExceptionHandler(Exception.class)
    public ResponseEntity<BaseResponse<ErrorDetails>> handleGlobalException(Exception ex, WebRequest request) {
        ErrorDetails details = ErrorDetails.builder()
                .timestamp(LocalDateTime.now())
                .message(ex.getMessage())
                .details(request.getDescription(false))
                .build();
        BaseResponse<ErrorDetails> response = BaseResponse.<ErrorDetails>builder()
                .success(false)
                .message("An unexpected error occurred")
                .data(details)
                .build();
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
