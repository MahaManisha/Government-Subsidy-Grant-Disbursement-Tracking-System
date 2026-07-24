package com.gov.subsidy.entity;

import com.gov.subsidy.enums.SchemeStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

@Entity
@Table(name = "schemes", indexes = {
        @Index(name = "idx_schemes_code", columnList = "code", unique = true),
        @Index(name = "idx_schemes_name", columnList = "name", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Scheme extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Scheme name is required")
    @Size(max = 150, message = "Scheme name must not exceed 150 characters")
    @Column(name = "name", unique = true, nullable = false, length = 150)
    private String name;

    @NotBlank(message = "Scheme code is required")
    @Size(max = 30, message = "Scheme code must not exceed 30 characters")
    @Column(name = "code", unique = true, nullable = false, length = 30)
    private String code;

    @NotBlank(message = "Scheme description is required")
    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    @Column(name = "description", nullable = false, length = 1000)
    private String description;

    @NotNull(message = "Budget allocation is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Budget allocation must be greater than zero")
    @Digits(integer = 15, fraction = 2, message = "Budget allocation limit exceeded")
    @Column(name = "budget_allocation", nullable = false, precision = 17, scale = 2)
    private BigDecimal budgetAllocation;

    @NotNull(message = "Remaining budget is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Remaining budget cannot be negative")
    @Digits(integer = 15, fraction = 2, message = "Remaining budget limit exceeded")
    @Column(name = "remaining_budget", nullable = false, precision = 17, scale = 2)
    private BigDecimal remainingBudget;

    @NotNull(message = "Start date is required")
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Builder.Default
    @Column(name = "active", nullable = false)
    private boolean active = true;

    @NotNull(message = "Scheme status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SchemeStatus status;

    @Column(name = "min_age")
    private Integer minAge;

    @Column(name = "max_age")
    private Integer maxAge;

    @Column(name = "max_annual_income", precision = 17, scale = 2)
    private BigDecimal maxAnnualIncome;

    @Column(name = "gender", length = 30)
    private String gender;

    @Column(name = "category", length = 30)
    private String category;

    @Column(name = "occupation", length = 100)
    private String occupation;

    @Column(name = "state", length = 100)
    private String state;

    @Column(name = "district", length = 100)
    private String district;

    @Column(name = "required_documents", length = 500)
    private String requiredDocuments;

    @Column(name = "max_grant_amount", precision = 17, scale = 2)
    private BigDecimal maxGrantAmount;

    @AssertTrue(message = "End date must be after the start date")
    private boolean isEndDateAfterStartDate() {
        if (startDate == null || endDate == null) {
            return true;
        }
        return endDate.isAfter(startDate);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Scheme scheme = (Scheme) o;
        return Objects.equals(id, scheme.id) || Objects.equals(code, scheme.code);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, code);
    }

    @Override
    public String toString() {
        return "Scheme{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", code='" + code + '\'' +
                ", budgetAllocation=" + budgetAllocation +
                ", remainingBudget=" + remainingBudget +
                ", active=" + active +
                ", status=" + status +
                '}';
    }
}
