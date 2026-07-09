# Architecture Documentation
## Government Subsidy / Grant Disbursement Tracking System

> **Version:** 1.1.0 — Milestone 1 (Persistence layer migrated to Supabase PostgreSQL)
> **Last Updated:** July 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Layer Descriptions](#4-layer-descriptions)
5. [Database Layer](#5-database-layer)
6. [Entity Relationships](#6-entity-relationships)
7. [Enum Catalogue](#7-enum-catalogue)
8. [Workflow Stages](#8-workflow-stages)
9. [Auditing](#9-auditing)
10. [Security](#10-security)
11. [API Documentation](#11-api-documentation)
12. [Why Supabase PostgreSQL](#12-why-supabase-postgresql)
13. [Deployment](#13-deployment)
14. [Migration Summary](#14-migration-summary)

---

## 1. Project Overview

The **Government Subsidy / Grant Disbursement Tracking System** is a Spring Boot backend application
designed to manage the end-to-end lifecycle of subsidy applications — from citizen submission,
through field verification and district approval, to financial disbursement and compliance auditing.

**Key Goals:**
- Full workflow traceability for every subsidy application.
- Role-based access for Admins, Field Officers, District Officers, Finance Officers, and Beneficiaries.
- Immutable audit logs for regulatory compliance.
- Cloud-hosted, production-ready PostgreSQL database via Supabase.

---

## 2. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Language | Java | 21 |
| Framework | Spring Boot | 3.3.1 |
| Build Tool | Maven | 3.x |
| Persistence | Spring Data JPA + Hibernate | via Spring Boot 3.3.1 |
| **Database** | **Supabase PostgreSQL** | **PostgreSQL 15+** |
| Database Driver | PostgreSQL JDBC Driver (`org.postgresql`) | managed by Spring Boot BOM |
| Validation | Hibernate Validator (Jakarta Bean Validation) | via Spring Boot |
| Security | Spring Security | via Spring Boot |
| API Documentation | Springdoc OpenAPI (Swagger UI) | 2.6.0 |
| Boilerplate Reduction | Lombok | optional |
| Dev Tooling | Spring Boot DevTools | runtime |

> **Note:** MySQL and `mysql-connector-j` have been fully removed as of v1.1.0.
> The project now exclusively uses Supabase PostgreSQL.

---

## 3. System Architecture

```
+------------------------------------------------------------+
|                        CLIENT LAYER                        |
|            (REST Clients, Swagger UI, Frontend)            |
+----------------------------+-------------------------------+
                             |  HTTP/HTTPS  (port 8081, /api)
+----------------------------v-------------------------------+
|                     CONTROLLER LAYER                       |
|                 (@RestController, /v1/**)                  |
+----------------------------+-------------------------------+
                             |
+----------------------------v-------------------------------+
|                       SERVICE LAYER                        |
|              (Business logic, Workflow rules)              |
+----------------------------+-------------------------------+
                             |
+----------------------------v-------------------------------+
|                     REPOSITORY LAYER                       |
|           (Spring Data JPA, JpaRepository<T,ID>)           |
+----------------------------+-------------------------------+
                             |  JDBC (PostgreSQL Driver)
+----------------------------v-------------------------------+
|               SUPABASE POSTGRESQL DATABASE                 |
|          (Cloud-hosted, Fully Managed, Port 5432)          |
+------------------------------------------------------------+
```

Cross-cutting concerns applied at all layers:
- **DTO / Mapper Layer** — separates API contracts from entity internals.
- **Exception Handling** — global `@ControllerAdvice` for consistent error responses.
- **Audit Layer** — `BaseEntity` with `@CreatedDate`, `@LastModifiedDate`, `@CreatedBy`, `@LastModifiedBy`.
- **Spring Security** — stateless JWT-ready filter chain (Milestone 2).

---

## 4. Layer Descriptions

### 4.1 Controller Layer (`controller/`)
- Annotated with `@RestController`.
- Maps HTTP verbs to service calls.
- Returns DTOs, never raw entities.
- All endpoints under `/api/v1/**`.

### 4.2 Service Layer (`service/`)
- Contains business logic and workflow enforcement.
- Validates state transitions (e.g., an application cannot jump from `SUBMITTED` to `DISBURSED`).
- Throws typed domain exceptions consumed by the global exception handler.

### 4.3 Repository Layer (`repository/`)
- Extends `JpaRepository<Entity, Long>`.
- Uses Spring Data derived queries (database-agnostic).
- No native SQL queries — fully portable between databases.

### 4.4 DTO / Mapper Layer (`dto/`, `mapper/`)
- Request DTOs carry inbound API data with Bean Validation annotations.
- Response DTOs expose only safe, relevant fields to the API consumer.
- MapStruct or manual mappers convert between entities and DTOs.

### 4.5 Entity Layer (`entity/`)
- JPA entities mapped to PostgreSQL tables.
- Extend `BaseEntity` for auditing fields.
- All column definitions use standard ANSI SQL types.

---

## 5. Database Layer

### 5.1 Database: Supabase PostgreSQL

**Database Name:** `postgres` (Supabase default)  
**Port:** `5432`  
**Driver:** `org.postgresql.Driver`  
**Dialect:** `org.hibernate.dialect.PostgreSQLDialect`  
**DDL Strategy:** `spring.jpa.hibernate.ddl-auto=update`

Supabase provides a fully managed PostgreSQL 15+ instance accessible over a standard JDBC connection.
All schema creation and evolution is handled by Hibernate's `ddl-auto=update` during development.

### 5.2 Tables

| Table | Entity Class | Description |
|---|---|---|
| `roles` | `Role` | Defines system roles |
| `users` | `User` | System users (all role types) |
| `user_roles` | Join Table | Many-to-many between users and roles |
| `beneficiaries` | `Beneficiary` | Citizen beneficiary profiles |
| `schemes` | `Scheme` | Government subsidy scheme definitions |
| `applications` | `Application` | Subsidy applications submitted by beneficiaries |
| `verifications` | `Verification` | Field verification records |
| `verification_histories` | `VerificationHistory` | Audit trail of verification actions |
| `disbursements` | `Disbursement` | Financial disbursement records |
| `compliances` | `Compliance` | Compliance check records per application |
| `notifications` | `Notification` | In-system notifications for users |
| `audit_logs` | `AuditLog` | Immutable system-wide audit trail |

### 5.3 BaseEntity (Inherited Audit Columns)

All entities except `AuditLog` and `Role` extend `BaseEntity`:

| Column | Type | Notes |
|---|---|---|
| `created_at` | `TIMESTAMP` | Set once on insert, not updatable |
| `updated_at` | `TIMESTAMP` | Updated on every modification |
| `created_by` | `VARCHAR` | Username of creator (via `AuditorAware`) |
| `updated_by` | `VARCHAR` | Username of last modifier |

---

## 6. Entity Relationships

```
User ──────────────────── Role              (Many-to-Many via user_roles)
User ──────────────────── Beneficiary       (One-to-One)
Beneficiary ───────────── Application       (One-to-Many)
Scheme ─────────────────── Application      (One-to-Many)
User (Officer) ─────────── Application      (Many-to-One, assigned_officer)
Application ─────────────── Verification    (One-to-One)
Application ─────────────── Disbursement    (One-to-One)
Application ─────────────── Compliance      (One-to-Many)
Verification ──────────── VerificationHistory (One-to-Many)
User ──────────────────── Notification      (One-to-Many, recipient)
User (Field Officer) ───── Verification     (Many-to-One)
User (Finance Officer) ─── Disbursement     (Many-to-One)
User (Officer) ─────────── VerificationHistory (Many-to-One)
```

---

## 7. Enum Catalogue

All enums are persisted as `VARCHAR` using `@Enumerated(EnumType.STRING)`, which is fully
compatible with PostgreSQL.

| Enum | Values |
|---|---|
| `RoleType` | `ROLE_ADMIN`, `ROLE_FIELD_OFFICER`, `ROLE_DISTRICT_OFFICER`, `ROLE_FINANCE_OFFICER`, `ROLE_BENEFICIARY` |
| `ApplicationStatus` | `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `DISBURSED` |
| `WorkflowStage` | `INITIATION`, `FIELD_VERIFICATION`, `DISTRICT_APPROVAL`, `FINANCIAL_DISBURSEMENT`, `COMPLETED` |
| `VerificationStatus` | `PENDING`, `VERIFIED`, `REJECTED` |
| `DisbursementStatus` | `PENDING`, `PROCESSING`, `SUCCESS`, `FAILED` |
| `SchemeStatus` | values defined in `SchemeStatus.java` |
| `Gender` | `MALE`, `FEMALE`, `OTHER` (and others as defined) |
| `BeneficiaryCategory` | `GENERAL`, `OBC`, `SC`, `ST`, `BPL` |
| `PriorityLevel` | `LOW`, `MEDIUM`, `HIGH` (and others as defined) |

---

## 8. Workflow Stages

A subsidy application progresses through the following stages:

```
INITIATION
    |
    v
FIELD_VERIFICATION   <--- Re-verification can be requested
    |
    v
DISTRICT_APPROVAL
    |
    v
FINANCIAL_DISBURSEMENT
    |
    v
COMPLETED
```

At each stage, the application's `currentStage` and `workflowStatus` are updated.
A `VerificationHistory` record is appended at every verification action for full traceability.

---

## 9. Auditing

Spring Data JPA Auditing is enabled via `@EnableJpaAuditing` in `AuditConfig`.

- `AuditorAware<String>` provides the current user's identity.
- In Milestone 1: returns `"SYSTEM"` (placeholder).
- In Milestone 2: will resolve the authenticated user from the Spring Security context.
- `@CreatedDate`, `@LastModifiedDate`, `@CreatedBy`, `@LastModifiedBy` are applied via `BaseEntity`.

The `AuditLog` table provides an additional, application-level immutable log of all significant
actions (independent of JPA auditing).

---

## 10. Security

Spring Security is configured in `SecurityConfig` with a stateless session policy:

- CSRF disabled (stateless REST API).
- `/v3/api-docs/**`, `/swagger-ui/**`, `/swagger-ui.html`, `/v1/**` — permitted without auth (dev mode).
- All other endpoints require authentication.
- Milestone 2 will introduce JWT-based authentication with role-based access control.

---

## 11. API Documentation

Swagger UI is available at:

```
http://localhost:8081/api/swagger-ui.html
```

OpenAPI JSON spec:

```
http://localhost:8081/api/v3/api-docs
```

Configured via Springdoc OpenAPI 2.6.0. Operations and tags are sorted alphabetically.

---

## 12. Why Supabase PostgreSQL

### 12.1 What is Supabase?

Supabase is an open-source Firebase alternative built on top of PostgreSQL. It provides a
fully managed, cloud-hosted PostgreSQL database with a web dashboard, REST API, and standard
JDBC connectivity — making it ideal for production-grade Spring Boot applications.

### 12.2 Why PostgreSQL over MySQL?

| Feature | MySQL (Local) | Supabase PostgreSQL |
|---|---|---|
| Hosting | Local machine only | Cloud-hosted, globally accessible |
| Availability | Only when dev machine is running | 24/7 managed uptime |
| Backups | Manual | Automatic daily backups via Supabase |
| SQL Standards Compliance | Partial | Excellent ANSI SQL compliance |
| Native BOOLEAN | No (uses TINYINT(1)) | Yes — native BOOLEAN type |
| JSON Support | Basic | Native JSONB with indexing |
| Auto-increment | MySQL-specific AUTO_INCREMENT | Standard SERIAL / BIGSERIAL |
| Scalability | Limited by local hardware | Scales with Supabase plan |
| Team Access | Single machine only | Shared across whole team via cloud |
| Cost for Development | Free (local) | Free tier available |
| Connection Security | Local network only | TLS-encrypted over the internet |

### 12.3 Benefits for This Project

1. **No local installation required** — all team members connect to the same cloud database.
2. **Automatic schema management** — Hibernate `ddl-auto=update` creates all tables on first run.
3. **Persistent data across machines** — data survives local machine restarts and re-deployments.
4. **Ready for Milestone 2** — JWT auth, role-based access, and real `AuditorAware` integration
   are easier to test with a shared, persistent cloud database.
5. **Production parity** — developing against the same PostgreSQL version used in production
   eliminates "works on my machine" database compatibility issues.
6. **Future-proof** — PostgreSQL's rich feature set (JSONB, full-text search, arrays, UUID) supports
   advanced features planned for later milestones without any driver or dialect changes.

### 12.4 Compatibility Summary

| Concern | Status | Detail |
|---|---|---|
| Entity annotations | Fully compatible | All standard JPA — no MySQL-specific annotations |
| Enum storage | Fully compatible | `EnumType.STRING` maps to `VARCHAR` in PostgreSQL |
| Boolean columns | Fully compatible | PostgreSQL has native `BOOLEAN` type |
| Decimal precision | Fully compatible | `DECIMAL(p,s)` is standard SQL |
| Date / Time types | Fully compatible | `LocalDateTime` to `TIMESTAMP`, `LocalDate` to `DATE` |
| Auto-increment | Fully compatible | `IDENTITY` strategy uses PostgreSQL sequences |
| Spring Auditing | Fully compatible | `AuditingEntityListener` is database-agnostic |
| Repository queries | Fully compatible | All derived queries, no native SQL used |

---

## 13. Deployment

### 13.1 Prerequisites

1. A Supabase account at https://supabase.com
2. A Supabase project created (free tier is sufficient for development).
3. Java 21 installed locally.
4. Maven 3.x installed locally.

### 13.2 Getting Your Supabase Credentials

1. Go to https://supabase.com/dashboard.
2. Select your project.
3. Navigate to **Settings > Database**.
4. Under **Connection string > JDBC**, find your host — it looks like:
   `db.<your-project-ref>.supabase.co`
5. Your password is the one you set when creating the Supabase project.

### 13.3 Configuring application.properties

Replace the placeholders in `src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://db.<your-project-ref>.supabase.co:5432/postgres
spring.datasource.username=postgres
spring.datasource.password=<your-supabase-db-password>
```

> SECURITY WARNING: Never commit real credentials to version control.
> Use environment variables or a `.env` file excluded via `.gitignore` for production deployments.

### 13.4 Running the Application

```bash
cd backend
mvn spring-boot:run
```

On first run, Hibernate will automatically create all tables in the Supabase `postgres` database
via `ddl-auto=update`. You can verify in the Supabase Dashboard under **Table Editor**.

### 13.5 Verifying the Connection

Once started, confirm:
- Application starts without `DataSourceLookupFailureException` or connection errors.
- Tables appear in Supabase Dashboard > Table Editor.
- Swagger UI loads at http://localhost:8081/api/swagger-ui.html

---

## 14. Migration Summary

### What Changed (v1.0.0 to v1.1.0)

| File | Change |
|---|---|
| `pom.xml` | Removed `mysql-connector-j`, added `postgresql` JDBC driver |
| `application.properties` | Replaced MySQL JDBC URL, driver, and credentials with Supabase PostgreSQL equivalents; added `PostgreSQLDialect`; removed MySQL-only JDBC params (`createDatabaseIfNotExist`, `useSSL`, `serverTimezone`, `allowPublicKeyRetrieval`) |
| `architecture_documentation.md` | Created this document; Technology Stack updated; Section 12 (Why Supabase PostgreSQL) added |

### What Did NOT Change

| Area | Status |
|---|---|
| All entity classes (12 files) | Unchanged — already PostgreSQL-compatible |
| All repository interfaces (5 files) | Unchanged — database-agnostic JPA queries |
| All enum classes (9 files) | Unchanged — `EnumType.STRING` is fully portable |
| `AuditConfig.java` | Unchanged — `AuditorAware` is database-agnostic |
| `SecurityConfig.java` | Unchanged |
| `BaseEntity.java` | Unchanged |
| DTOs, Mappers, Controllers, Services | Unchanged |
| Package structure | Unchanged |
| Business logic | Unchanged |
| API contracts | Unchanged |

### PostgreSQL Compatibility Report

All 12 entity classes were reviewed against PostgreSQL compatibility requirements:

- No MySQL-specific column types found (no TINYINT, MEDIUMTEXT, LONGTEXT, etc.)
- No MySQL-specific annotations found (no `@Column(columnDefinition = "...")` with MySQL syntax)
- All boolean fields use Java `boolean` / `Boolean` — maps to PostgreSQL native `BOOLEAN`
- All enum fields use `@Enumerated(EnumType.STRING)` — maps to PostgreSQL `VARCHAR`
- All decimal fields use standard `precision` / `scale` — maps to PostgreSQL `NUMERIC(p,s)`
- All primary keys use `GenerationType.IDENTITY` — maps to PostgreSQL identity columns
- All date/time fields use `LocalDateTime` / `LocalDate` — standard JDBC mappings
- All string lengths use `length` attribute on `@Column` — maps to PostgreSQL `VARCHAR(n)`
- All repositories use derived queries only — zero native SQL, no migration needed

**Result: Zero entity or repository changes required. Migration is purely at the configuration level.**
