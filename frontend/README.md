# Government Subsidy & Grant Disbursement Tracking System — React Frontend SPA

This repository contains the production-ready React 19 Single Page Application (SPA) for the **Government Subsidy & Grant Disbursement Tracking System**, built on top of the Vite tooling chain and styled with custom Tailwind CSS variables.

---

## 1. Project Folder Structure

```
frontend/
├── dist/                     # Production build artifacts
├── public/                   # Static public assets (images, manifest, etc.)
├── src/
│   ├── api/
│   │   └── axiosInstance.js  # Global Axios client with base paths & interceptors
│   ├── components/
│   │   ├── Footer.jsx        # Dashboard system footer
│   │   ├── LoadingSpinner.jsx# Global reusable loader spin component
│   │   ├── Navbar.jsx        # collapsable header with role selection trigger
│   │   └── Sidebar.jsx       # collapsible vertical administrative navigation
│   ├── layouts/
│   │   ├── DashboardLayout.jsx# layout wrapping sidebar, navbar, and footer panels
│   │   └── ProtectedLayout.jsx# Protected contexts layer with active user roles
│   ├── pages/
│   │   ├── Analytics.jsx     # Recharts district releases & state maps visualizer
│   │   ├── ApplicationDetails.jsx # Detailed application audit progress view
│   │   ├── ApplicationForm.jsx # Lookup dropdowns beneficiary + scheme form
│   │   ├── ApplicationList.jsx # Responsive filterable tracking ledger
│   │   ├── BeneficiaryDetails.jsx # Detailed citizen profile card
│   │   ├── BeneficiaryForm.jsx # validation React Hook Form for Citizens
│   │   ├── BeneficiaryList.jsx # Paginated citizen search directory
│   │   ├── Compliance.jsx    # Evidence submissions and inspection timeline
│   │   ├── Dashboard.jsx     # Aggregated operations counters and charts
│   │   ├── Disbursement.jsx  # Milestone disbursement scheduling and releases
│   │   ├── Eligibility.jsx   # live scorecard engine rule contribution check
│   │   ├── NotFound.jsx      # Fallback 404 page for route boundary checks
│   │   ├── Settings.jsx      # SLA limits and Light/Dark Mode switches
│   │   └── Verification.jsx  # Assign officer and Stage review dashboards
│   ├── App.jsx               # Client side central React Router index
│   ├── index.css             # Main styling import with Light/Dark system variables
│   └── main.jsx              # React DOM render entry point
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
└── README.md                 # Project manual documentation
```

---

## 2. API Integration Report

All pages connect directly to the Spring Boot REST services via the shared Axios client. A summary of active integrations:

| Module / Operation | HTTP Method | API Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Beneficiary List** | `GET` | `/v1/beneficiaries` | Fetches all registered citizen records |
| **Create Beneficiary** | `POST` | `/v1/beneficiaries` | Creates a citizen profile (Aadhaar, Bank details) |
| **Update Beneficiary** | `PUT` | `/v1/beneficiaries/{id}` | Modifies profile specifications |
| **Delete Beneficiary** | `DELETE` | `/v1/beneficiaries/{id}` | Permanently deletes a profile record |
| **Scheme List** | `GET` | `/v1/schemes` | Fetches government scheme catalogs |
| **Create Scheme** | `POST` | `/v1/schemes` | Schedules a new grant program |
| **Update Scheme** | `PUT` | `/v1/schemes/{id}` | Updates budgets or active toggles |
| **Submit Application** | `POST` | `/v1/applications` | Dispatches file submissions to database |
| **Eligibility Scoring** | `POST` | `/v1/applications/{id}/score` | Evaluates Drools rules scoring (Income, SC/ST, etc.) |
| **Assign Officer** | `POST` | `/v1/applications/{id}/verification/assign-officer` | Begins audit by assigning field officer |
| **Verification Reviews** | `POST` | `/v1/applications/{id}/verification/{stage}` | Submits stage review outcome decisions |
| **Get Verification Details** | `GET` | `/v1/applications/{id}/verification` | Fetches current review status and comments |
| **Verification History** | `GET` | `/v1/applications/{id}/verification/history` | Fetches stage transition log timelines |
| **Disbursement Plans List** | `GET` | `/v1/disbursement-plans` | Fetches all active planned milestone templates |
| **Create Plan** | `POST` | `/v1/disbursement-plans` | Automated milestone scheduling percentages |
| **Release Milestone** | `POST` | `/v1/disbursement-plans/{id}/milestones/{no}/release` | Releases payment if compliance checks pass |
| **Submit Compliance** | `POST` | `/v1/compliances` | Submits milestone invoice evidence proof metadata |
| **Approve Compliance** | `POST` | `/v1/compliances/{id}/approve` | Clears next milestone payment blocks |
| **Reject Compliance** | `POST` | `/v1/compliances/{id}/reject` | Marks milestone checks as failed (non-compliant) |
| **Analytics Summary** | `GET` | `/v1/analytics/report` | Fetches aggregated regional/national metrics |

---

## 3. Production Readiness & JWT preparation

- **JWT Prep (Milestone 4)**: The `axiosInstance.js` file is built to automatically attach standard `Authorization: Bearer <token>` headers if a token is present in the browser local storage. Router paths are wrapped in `ProtectedLayout` to dynamically swap roles and restrict module panels once the login session pages are mapped in Milestone 4.
- **Global Error Interceptor**: Axios interceptor extracts error strings from standard Spring Boot validation responses (`validationErrors`) and renders individual error toasts automatically.
- **Dark Mode**: Swapping colors is managed globally via CSS variables inside `index.css`. Toggling the option in Settings adds the class `.dark` to the document root and persists the setting across page reloads.

---

## 4. How to Start Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` to test.
3. **Compile Production Bundle**:
   ```bash
   npm run build
   ```
