package com.gov.subsidy.exception;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ErrorDetails {

    private Integer status;
    private String error;
    private LocalDateTime timestamp;
    private String message;
    private String details;
    private List<String> validationErrors;
}
