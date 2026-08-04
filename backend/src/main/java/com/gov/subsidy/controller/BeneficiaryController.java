package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.BaseResponse;
import com.gov.subsidy.dto.BeneficiaryCreateDto;
import com.gov.subsidy.dto.BeneficiaryDto;
import com.gov.subsidy.dto.BeneficiaryUpdateDto;
import com.gov.subsidy.exception.ErrorDetails;
import com.gov.subsidy.service.BeneficiaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.access.prepost.PostAuthorize;

import java.util.List;

/**
 * REST controller exposing all CRUD endpoints for the Beneficiary Management module.
 *
 * <p>Base URL: {@code /api/v1/beneficiaries}</p>
 *
 * <p>All endpoints return a {@link BaseResponse} wrapper containing:
 * <ul>
 *   <li>{@code success} — boolean flag indicating outcome</li>
 *   <li>{@code message} — human-readable summary of the result</li>
 *   <li>{@code data} — the response payload (may be {@code null} for 204 / error scenarios)</li>
 *   <li>{@code timestamp} — UTC timestamp of the response</li>
 * </ul>
 * </p>
 */
@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/beneficiaries")
@Tag(
        name = "Beneficiary Management",
        description = "CRUD operations for managing beneficiary profiles in the Government Subsidy " +
                "Disbursement Tracking System. Each beneficiary represents an eligible citizen who " +
                "may receive government grants or subsidies."
)
public class BeneficiaryController {

    private final BeneficiaryService beneficiaryService;

    public BeneficiaryController(BeneficiaryService beneficiaryService) {
        this.beneficiaryService = beneficiaryService;
    }

    // =========================================================================
    // POST /v1/beneficiaries — Create Beneficiary
    // =========================================================================

    @PostMapping
    @Operation(
            summary = "Create a new beneficiary profile",
            description = "Registers a new beneficiary in the system. " +
                    "Validates that the Aadhaar number, phone number, and bank account number " +
                    "are unique. Optionally links the beneficiary to an existing user account."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "201",
                    description = "Beneficiary profile created successfully",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class),
                            examples = @ExampleObject(
                                    name = "Created",
                                    value = """
                                            {
                                              "success": true,
                                              "message": "Beneficiary profile created successfully",
                                              "data": {
                                                "id": 1,
                                                "user": null,
                                                "uniqueIdNumber": "123456789012",
                                                "phoneNumber": "9876543210",
                                                "address": "123, Green Valley, New Delhi, 110001",
                                                "bankAccountNumber": "918273645281",
                                                "bankIfscCode": "SBIN0001234",
                                                "annualIncome": 150000.00,
                                                "eligibilityStatus": "PENDING",
                                                "gender": "MALE",
                                                "category": "OBC",
                                                "createdAt": "2026-07-09T10:00:00",
                                                "updatedAt": "2026-07-09T10:00:00",
                                                "createdBy": "SYSTEM",
                                                "updatedBy": "SYSTEM"
                                              },
                                              "timestamp": "2026-07-09T10:00:00"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Validation failed — one or more input fields are invalid",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class),
                            examples = @ExampleObject(
                                    name = "Validation Error",
                                    value = """
                                            {
                                              "success": false,
                                              "message": "Input validation failed",
                                              "data": {
                                                "timestamp": "2026-07-09T10:00:00",
                                                "message": "Validation failed",
                                                "details": "uri=/api/v1/beneficiaries",
                                                "validationErrors": [
                                                  "Aadhaar number must be exactly 12 digits",
                                                  "IFSC code must be valid (e.g. SBIN0001234)"
                                                ]
                                              },
                                              "timestamp": "2026-07-09T10:00:00"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "Conflict — Aadhaar number, phone number, or bank account number already exists",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class),
                            examples = @ExampleObject(
                                    name = "Duplicate Aadhaar",
                                    value = """
                                            {
                                              "success": false,
                                              "message": "Duplicate resource conflict",
                                              "data": {
                                                "timestamp": "2026-07-09T10:00:00",
                                                "message": "A beneficiary with Aadhaar number '123456789012' already exists.",
                                                "details": "uri=/api/v1/beneficiaries"
                                              },
                                              "timestamp": "2026-07-09T10:00:00"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "User not found — the provided userId does not match any user account",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = BaseResponse.class))
            )
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BaseResponse<BeneficiaryDto>> createBeneficiary(
            @Valid @RequestBody BeneficiaryCreateDto createDto) {

        BeneficiaryDto created = beneficiaryService.createBeneficiary(createDto);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(BaseResponse.success(created, "Beneficiary profile created successfully"));
    }

    // =========================================================================
    // GET /v1/beneficiaries — Get All Beneficiaries
    // =========================================================================

    @GetMapping
    @Operation(
            summary = "Retrieve all beneficiary profiles",
            description = "Returns the complete list of beneficiary profiles currently registered in the system. " +
                    "An empty list is returned if no beneficiaries have been created yet."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Beneficiary list fetched successfully",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class),
                            examples = @ExampleObject(
                                    name = "List",
                                    value = """
                                            {
                                              "success": true,
                                              "message": "Beneficiary list fetched successfully",
                                              "data": [
                                                {
                                                  "id": 1,
                                                  "uniqueIdNumber": "123456789012",
                                                  "phoneNumber": "9876543210",
                                                  "address": "123, Green Valley, New Delhi, 110001",
                                                  "bankAccountNumber": "918273645281",
                                                  "bankIfscCode": "SBIN0001234",
                                                  "annualIncome": 150000.00,
                                                  "eligibilityStatus": "VERIFIED",
                                                  "gender": "MALE",
                                                  "category": "OBC"
                                                }
                                              ],
                                              "timestamp": "2026-07-09T10:00:00"
                                            }
                                            """
                            )
                    )
            )
    })
    @PreAuthorize("hasAnyRole('ADMIN', 'FIELD_OFFICER', 'DISTRICT_OFFICER', 'FINANCE_OFFICER', 'BENEFICIARY')")
    public ResponseEntity<BaseResponse<List<BeneficiaryDto>>> getAllBeneficiaries() {
        List<BeneficiaryDto> beneficiaries = beneficiaryService.getAllBeneficiaries();
        return ResponseEntity.ok(BaseResponse.success(beneficiaries, "Beneficiary list fetched successfully"));
    }

    // =========================================================================
    // GET /v1/beneficiaries/me — Get Logged-in Beneficiary Profile
    // =========================================================================

    @GetMapping("/me")
    @PreAuthorize("hasRole('BENEFICIARY')")
    @Operation(
            summary = "Retrieve the logged-in beneficiary's profile",
            description = "Resolves the current authenticated user context and returns their linked beneficiary profile details."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Beneficiary details fetched successfully",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = BaseResponse.class))
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Unauthorized access",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = BaseResponse.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Beneficiary profile not found",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = BaseResponse.class))
            )
    })
    public ResponseEntity<BaseResponse<BeneficiaryDto>> getMyProfile(java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(BaseResponse.error("Unauthorized"));
        }
        BeneficiaryDto beneficiary = beneficiaryService.getBeneficiaryByUsername(principal.getName());
        return ResponseEntity.ok(BaseResponse.success(beneficiary, "Beneficiary profile fetched successfully"));
    }

    // =========================================================================
    // GET /v1/beneficiaries/{id} — Get Beneficiary By ID
    // =========================================================================

    @GetMapping("/{id}")
    @Operation(
            summary = "Retrieve a beneficiary profile by ID",
            description = "Fetches the full details of a single beneficiary profile identified by its unique ID."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Beneficiary details fetched successfully",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = BaseResponse.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Beneficiary not found",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class),
                            examples = @ExampleObject(
                                    name = "Not Found",
                                    value = """
                                            {
                                              "success": false,
                                              "message": "Resource not found",
                                              "data": {
                                                "timestamp": "2026-07-09T10:00:00",
                                                "message": "Beneficiary not found with ID: 99",
                                                "details": "uri=/api/v1/beneficiaries/99"
                                              },
                                              "timestamp": "2026-07-09T10:00:00"
                                            }
                                            """
                            )
                    )
            )
    })
    @PostAuthorize("hasRole('ADMIN') or (returnObject != null && returnObject.body != null && returnObject.body.data != null && returnObject.body.data.user != null && returnObject.body.data.user.username == principal.username)")
    public ResponseEntity<BaseResponse<BeneficiaryDto>> getBeneficiaryById(
            @Parameter(description = "Unique numeric ID of the beneficiary", example = "1", required = true)
            @PathVariable Long id) {

        BeneficiaryDto beneficiary = beneficiaryService.getBeneficiaryById(id);
        return ResponseEntity.ok(BaseResponse.success(beneficiary, "Beneficiary details fetched successfully"));
    }

    // =========================================================================
    // PUT /v1/beneficiaries/{id} — Update Beneficiary
    // =========================================================================

    @PutMapping("/{id}")
    @Operation(
            summary = "Update an existing beneficiary profile",
            description = "Updates the mutable fields of an existing beneficiary profile. " +
                    "The Aadhaar number (uniqueIdNumber) is immutable and cannot be changed. " +
                    "Phone number and bank account number must remain unique across all beneficiaries."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Beneficiary profile updated successfully",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = BaseResponse.class))
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Validation failed or invalid enum value provided",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = BaseResponse.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Beneficiary not found with the given ID",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = BaseResponse.class))
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "Conflict — phone number or bank account number is already in use",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class),
                            examples = @ExampleObject(
                                    name = "Duplicate Phone",
                                    value = """
                                            {
                                              "success": false,
                                              "message": "Duplicate resource conflict",
                                              "data": {
                                                "timestamp": "2026-07-09T10:00:00",
                                                "message": "Phone number '9876543210' is already in use by another beneficiary.",
                                                "details": "uri=/api/v1/beneficiaries/2"
                                              },
                                              "timestamp": "2026-07-09T10:00:00"
                                            }
                                            """
                            )
                    )
            )
    })
    @PreAuthorize("hasRole('ADMIN') or (principal != null && @beneficiaryServiceImpl.getBeneficiaryById(#id).user != null && @beneficiaryServiceImpl.getBeneficiaryById(#id).user.username == principal.username)")
    public ResponseEntity<BaseResponse<BeneficiaryDto>> updateBeneficiary(
            @Parameter(description = "Unique numeric ID of the beneficiary to update", example = "1", required = true)
            @PathVariable Long id,
            @Valid @RequestBody BeneficiaryUpdateDto updateDto) {

        BeneficiaryDto updated = beneficiaryService.updateBeneficiary(id, updateDto);
        return ResponseEntity.ok(BaseResponse.success(updated, "Beneficiary profile updated successfully"));
    }

    // =========================================================================
    // DELETE /v1/beneficiaries/{id} — Delete Beneficiary
    // =========================================================================

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Delete a beneficiary profile",
            description = "Permanently removes the beneficiary profile with the given ID from the system. " +
                    "This action is irreversible. Any applications or disbursements linked to this " +
                    "beneficiary may be affected."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Beneficiary profile deleted successfully",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class),
                            examples = @ExampleObject(
                                    name = "Deleted",
                                    value = """
                                            {
                                              "success": true,
                                              "message": "Beneficiary profile with ID 1 deleted successfully",
                                              "data": null,
                                              "timestamp": "2026-07-09T10:00:00"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Beneficiary not found with the given ID",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = BaseResponse.class))
            )
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BaseResponse<Void>> deleteBeneficiary(
            @Parameter(description = "Unique numeric ID of the beneficiary to delete", example = "1", required = true)
            @PathVariable Long id) {

        beneficiaryService.deleteBeneficiary(id);
        return ResponseEntity.ok(
                BaseResponse.success(null, "Beneficiary profile with ID " + id + " deleted successfully"));
    }

    // =========================================================================
    // APPROVAL WORKFLOW ENDPOINTS
    // =========================================================================

    @PutMapping("/{id}/approve")
    @Operation(summary = "Approve beneficiary registration", description = "Admin approves a beneficiary profile, setting status to VERIFIED.")
    @PreAuthorize("hasAnyRole('ADMIN', 'DISTRICT_OFFICER', 'FIELD_OFFICER')")
    public ResponseEntity<BaseResponse<BeneficiaryDto>> approveBeneficiary(
            @PathVariable Long id,
            @RequestBody(required = false) com.gov.subsidy.dto.BeneficiaryApprovalDto approvalDto,
            java.security.Principal principal) {
        String admin = principal != null ? principal.getName() : "ADMIN";
        String remarks = approvalDto != null ? approvalDto.getRemarks() : null;
        BeneficiaryDto approved = beneficiaryService.approveBeneficiary(id, remarks, admin);
        return ResponseEntity.ok(BaseResponse.success(approved, "Beneficiary approved successfully"));
    }

    @PutMapping("/{id}/reject")
    @Operation(summary = "Reject beneficiary registration", description = "Admin rejects a beneficiary profile with reason, setting status to REJECTED.")
    @PreAuthorize("hasAnyRole('ADMIN', 'DISTRICT_OFFICER', 'FIELD_OFFICER')")
    public ResponseEntity<BaseResponse<BeneficiaryDto>> rejectBeneficiary(
            @PathVariable Long id,
            @RequestBody(required = false) com.gov.subsidy.dto.BeneficiaryApprovalDto approvalDto,
            java.security.Principal principal) {
        String admin = principal != null ? principal.getName() : "ADMIN";
        String reason = approvalDto != null ? (approvalDto.getReason() != null ? approvalDto.getReason() : approvalDto.getRemarks()) : null;
        BeneficiaryDto rejected = beneficiaryService.rejectBeneficiary(id, reason, admin);
        return ResponseEntity.ok(BaseResponse.success(rejected, "Beneficiary registration rejected"));
    }

    @PutMapping("/{id}/request-changes")
    @Operation(summary = "Request changes for beneficiary registration", description = "Admin requests modifications for a beneficiary profile, setting status to CHANGES_REQUIRED.")
    @PreAuthorize("hasAnyRole('ADMIN', 'DISTRICT_OFFICER', 'FIELD_OFFICER')")
    public ResponseEntity<BaseResponse<BeneficiaryDto>> requestChanges(
            @PathVariable Long id,
            @RequestBody(required = false) com.gov.subsidy.dto.BeneficiaryApprovalDto approvalDto,
            java.security.Principal principal) {
        String admin = principal != null ? principal.getName() : "ADMIN";
        String remarks = approvalDto != null ? approvalDto.getRemarks() : null;
        BeneficiaryDto updated = beneficiaryService.requestChanges(id, remarks, admin);
        return ResponseEntity.ok(BaseResponse.success(updated, "Changes requested for beneficiary profile"));
    }

    @PutMapping("/{id}/resubmit")
    @Operation(summary = "Resubmit beneficiary profile", description = "Beneficiary resubmits profile after making requested changes, resetting status to PENDING.")
    @PreAuthorize("hasAnyRole('BENEFICIARY', 'ADMIN')")
    public ResponseEntity<BaseResponse<BeneficiaryDto>> resubmitBeneficiary(@PathVariable Long id) {
        BeneficiaryDto resubmitted = beneficiaryService.resubmitBeneficiary(id);
        return ResponseEntity.ok(BaseResponse.success(resubmitted, "Beneficiary profile resubmitted for verification"));
    }
}
