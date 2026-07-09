package com.gov.subsidy.controller;

import com.gov.subsidy.constant.ApiConstants;
import com.gov.subsidy.dto.BaseResponse;
import com.gov.subsidy.dto.SchemeCreateDto;
import com.gov.subsidy.dto.SchemeDto;
import com.gov.subsidy.dto.SchemeUpdateDto;
import com.gov.subsidy.service.SchemeService;
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

import java.util.List;

/**
 * REST controller exposing all CRUD endpoints for the Scheme Management module.
 *
 * <p>Base URL: {@code /api/v1/schemes}</p>
 *
 * <p>All responses are wrapped in a {@link BaseResponse} envelope:</p>
 * <ul>
 *   <li>{@code success} — boolean outcome flag</li>
 *   <li>{@code message} — human-readable result summary</li>
 *   <li>{@code data}    — the response payload ({@code null} on error/delete)</li>
 *   <li>{@code timestamp} — response generation time (UTC)</li>
 * </ul>
 */
@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX + "/schemes")
@Tag(
        name = "Scheme Management",
        description = "CRUD operations for managing government subsidy/grant schemes. " +
                "A Scheme defines the programme under which eligible beneficiaries can receive " +
                "disbursements. Each scheme has a unique code, a budget, and a validity window."
)
public class SchemeController {

    private final SchemeService schemeService;

    public SchemeController(SchemeService schemeService) {
        this.schemeService = schemeService;
    }

    // =========================================================================
    // POST /v1/schemes — Create Scheme
    // =========================================================================

    @PostMapping
    @Operation(
            summary = "Create a new government scheme",
            description = "Registers a new scheme in the system. " +
                    "Validates that the scheme code and name are unique, " +
                    "the budget allocation is positive, and the end date is strictly after the start date. " +
                    "The remaining budget is automatically initialised to the full budget allocation. " +
                    "The active flag is automatically set to true."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "201",
                    description = "Scheme created successfully",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class),
                            examples = @ExampleObject(
                                    name = "Created",
                                    value = """
                                            {
                                              "success": true,
                                              "message": "Scheme created successfully",
                                              "data": {
                                                "id": 1,
                                                "name": "Pradhan Mantri Fasal Bima Yojana",
                                                "code": "PMFBY-2026",
                                                "description": "Crop insurance scheme for farmers.",
                                                "budgetAllocation": 50000000.00,
                                                "remainingBudget": 50000000.00,
                                                "startDate": "2026-06-01",
                                                "endDate": "2027-06-01",
                                                "active": true,
                                                "status": "ACTIVE",
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
                    description = "Validation failed — invalid field values or end date not after start date",
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
                                                "details": "uri=/api/v1/schemes",
                                                "validationErrors": [
                                                  "Budget allocation must be greater than zero",
                                                  "End date must be a future date"
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
                    description = "Conflict — scheme code or name already exists",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class),
                            examples = @ExampleObject(
                                    name = "Duplicate Code",
                                    value = """
                                            {
                                              "success": false,
                                              "message": "Duplicate resource conflict",
                                              "data": {
                                                "timestamp": "2026-07-09T10:00:00",
                                                "message": "A scheme with code 'PMFBY-2026' already exists.",
                                                "details": "uri=/api/v1/schemes"
                                              },
                                              "timestamp": "2026-07-09T10:00:00"
                                            }
                                            """
                            )
                    )
            )
    })
    public ResponseEntity<BaseResponse<SchemeDto>> createScheme(
            @Valid @RequestBody SchemeCreateDto createDto) {

        SchemeDto created = schemeService.createScheme(createDto);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(BaseResponse.success(created, "Scheme created successfully"));
    }

    // =========================================================================
    // GET /v1/schemes — Get All Schemes
    // =========================================================================

    @GetMapping
    @Operation(
            summary = "Retrieve all government schemes",
            description = "Returns the complete list of scheme records. " +
                    "An empty list is returned when no schemes have been created yet."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Scheme list fetched successfully",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class),
                            examples = @ExampleObject(
                                    name = "List",
                                    value = """
                                            {
                                              "success": true,
                                              "message": "Schemes fetched successfully",
                                              "data": [
                                                {
                                                  "id": 1,
                                                  "name": "Pradhan Mantri Fasal Bima Yojana",
                                                  "code": "PMFBY-2026",
                                                  "budgetAllocation": 50000000.00,
                                                  "remainingBudget": 42000000.00,
                                                  "startDate": "2026-06-01",
                                                  "endDate": "2027-06-01",
                                                  "active": true,
                                                  "status": "ACTIVE"
                                                },
                                                {
                                                  "id": 2,
                                                  "name": "National Fellowship for Higher Education",
                                                  "code": "NFHE-2026",
                                                  "budgetAllocation": 15000000.00,
                                                  "remainingBudget": 15000000.00,
                                                  "startDate": "2026-07-01",
                                                  "endDate": "2027-07-01",
                                                  "active": true,
                                                  "status": "ACTIVE"
                                                }
                                              ],
                                              "timestamp": "2026-07-09T10:00:00"
                                            }
                                            """
                            )
                    )
            )
    })
    public ResponseEntity<BaseResponse<List<SchemeDto>>> getAllSchemes() {
        List<SchemeDto> schemes = schemeService.getAllSchemes();
        return ResponseEntity.ok(BaseResponse.success(schemes, "Schemes fetched successfully"));
    }

    // =========================================================================
    // GET /v1/schemes/{id} — Get Scheme By ID
    // =========================================================================

    @GetMapping("/{id}")
    @Operation(
            summary = "Retrieve a scheme by ID",
            description = "Fetches the full details of a single scheme identified by its unique numeric ID."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Scheme details fetched successfully",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = BaseResponse.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Scheme not found",
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
                                                "message": "Scheme not found with ID: 99",
                                                "details": "uri=/api/v1/schemes/99"
                                              },
                                              "timestamp": "2026-07-09T10:00:00"
                                            }
                                            """
                            )
                    )
            )
    })
    public ResponseEntity<BaseResponse<SchemeDto>> getSchemeById(
            @Parameter(description = "Unique numeric ID of the scheme", example = "1", required = true)
            @PathVariable Long id) {

        SchemeDto scheme = schemeService.getSchemeById(id);
        return ResponseEntity.ok(BaseResponse.success(scheme, "Scheme details fetched successfully"));
    }

    // =========================================================================
    // PUT /v1/schemes/{id} — Update Scheme
    // =========================================================================

    @PutMapping("/{id}")
    @Operation(
            summary = "Update an existing scheme",
            description = "Updates the mutable fields of a scheme. " +
                    "The scheme code is immutable after creation. " +
                    "The remaining budget is recalculated automatically based on the new budget allocation " +
                    "and the already-disbursed amount. " +
                    "The new budget allocation cannot be less than the amount already disbursed. " +
                    "The active flag can be toggled here to activate or deactivate the scheme."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Scheme updated successfully",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class),
                            examples = @ExampleObject(
                                    name = "Updated",
                                    value = """
                                            {
                                              "success": true,
                                              "message": "Scheme updated successfully",
                                              "data": {
                                                "id": 1,
                                                "name": "Pradhan Mantri Fasal Bima Yojana (Revised)",
                                                "code": "PMFBY-2026",
                                                "budgetAllocation": 75000000.00,
                                                "remainingBudget": 67000000.00,
                                                "startDate": "2026-06-01",
                                                "endDate": "2027-12-31",
                                                "active": true,
                                                "status": "ACTIVE"
                                              },
                                              "timestamp": "2026-07-09T10:00:00"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Validation error, invalid date range, invalid status, or budget below disbursed amount",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class),
                            examples = @ExampleObject(
                                    name = "Invalid Date Range",
                                    value = """
                                            {
                                              "success": false,
                                              "message": "Invalid argument provided",
                                              "data": {
                                                "timestamp": "2026-07-09T10:00:00",
                                                "message": "End date (2026-01-01) must be strictly after start date (2026-06-01).",
                                                "details": "uri=/api/v1/schemes/1"
                                              },
                                              "timestamp": "2026-07-09T10:00:00"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Scheme not found with the given ID",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = BaseResponse.class))
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "Conflict — updated scheme name is already used by another scheme",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class),
                            examples = @ExampleObject(
                                    name = "Duplicate Name",
                                    value = """
                                            {
                                              "success": false,
                                              "message": "Duplicate resource conflict",
                                              "data": {
                                                "timestamp": "2026-07-09T10:00:00",
                                                "message": "A scheme with name 'National Fellowship for Higher Education' already exists.",
                                                "details": "uri=/api/v1/schemes/1"
                                              },
                                              "timestamp": "2026-07-09T10:00:00"
                                            }
                                            """
                            )
                    )
            )
    })
    public ResponseEntity<BaseResponse<SchemeDto>> updateScheme(
            @Parameter(description = "Unique numeric ID of the scheme to update", example = "1", required = true)
            @PathVariable Long id,
            @Valid @RequestBody SchemeUpdateDto updateDto) {

        SchemeDto updated = schemeService.updateScheme(id, updateDto);
        return ResponseEntity.ok(BaseResponse.success(updated, "Scheme updated successfully"));
    }

    // =========================================================================
    // DELETE /v1/schemes/{id} — Delete Scheme
    // =========================================================================

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Delete a scheme",
            description = "Permanently removes the scheme with the given ID from the system. " +
                    "This action is irreversible. Any applications or disbursements linked to " +
                    "this scheme may be affected."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Scheme deleted successfully",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = BaseResponse.class),
                            examples = @ExampleObject(
                                    name = "Deleted",
                                    value = """
                                            {
                                              "success": true,
                                              "message": "Scheme with ID 1 deleted successfully",
                                              "data": null,
                                              "timestamp": "2026-07-09T10:00:00"
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Scheme not found with the given ID",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = BaseResponse.class))
            )
    })
    public ResponseEntity<BaseResponse<Void>> deleteScheme(
            @Parameter(description = "Unique numeric ID of the scheme to delete", example = "1", required = true)
            @PathVariable Long id) {

        schemeService.deleteScheme(id);
        return ResponseEntity.ok(
                BaseResponse.success(null, "Scheme with ID " + id + " deleted successfully"));
    }
}
