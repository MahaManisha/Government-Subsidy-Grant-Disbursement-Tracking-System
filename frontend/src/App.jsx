import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedLayout from './layouts/ProtectedLayout';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import BeneficiaryList from './pages/BeneficiaryList';
import BeneficiaryForm from './pages/BeneficiaryForm';
import BeneficiaryDetails from './pages/BeneficiaryDetails';
import SchemeList from './pages/SchemeList';
import SchemeForm from './pages/SchemeForm';
import SchemeDetails from './pages/SchemeDetails';
import ApplicationList from './pages/ApplicationList';
import ApplicationForm from './pages/ApplicationForm';
import ApplicationDetails from './pages/ApplicationDetails';
import Eligibility from './pages/Eligibility';
import Verification from './pages/Verification';
import Disbursement from './pages/Disbursement';
import Compliance from './pages/Compliance';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Users from './pages/Users';
import Register from './pages/Register';
import DistrictDashboard from './pages/DistrictDashboard';
import DistrictReviews from './pages/DistrictReviews';
import DistrictVerification from './pages/DistrictVerification';
import FieldOfficerDashboard from './pages/FieldOfficerDashboard';
import FinanceOfficerDashboard from './pages/FinanceOfficerDashboard';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  useEffect(() => {
    // Restore theme setting
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Session Context */}
        <Route element={<ProtectedLayout />}>
          {/* Main Dashboard Layout Shell */}
          <Route element={<DashboardLayout />}>
            {/* Common Dashboard */}
            <Route path="/" element={<Dashboard />} />

            {/* Admin Only Routes */}
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/beneficiaries"
              element={
                <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
                  <BeneficiaryList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/beneficiaries/add"
              element={
                <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
                  <BeneficiaryForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/beneficiaries/edit/:id"
              element={
                <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_BENEFICIARY']}>
                  <BeneficiaryForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Beneficiary Profile (Self-lookup path) */}
            <Route
              path="/beneficiaries/my-profile"
              element={
                <ProtectedRoute allowedRoles={['ROLE_BENEFICIARY']}>
                  <BeneficiaryDetails isSelfProfile={true} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/beneficiaries/:id"
              element={
                <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_BENEFICIARY']}>
                  <BeneficiaryDetails />
                </ProtectedRoute>
              }
            />

            {/* Schemes Management (Viewable by all, editable by Admin) */}
            <Route path="/schemes" element={<SchemeList />} />
            <Route
              path="/schemes/add"
              element={
                <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
                  <SchemeForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/schemes/edit/:id"
              element={
                <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
                  <SchemeForm />
                </ProtectedRoute>
              }
            />
            <Route path="/schemes/:id" element={<SchemeDetails />} />

            {/* Applications (Admin & Officers list; Beneficiary My Applications list) */}
            <Route
              path="/applications"
              element={
                <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_FIELD_OFFICER', 'ROLE_DISTRICT_OFFICER', 'ROLE_FINANCE_OFFICER']}>
                  <ApplicationList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/assigned"
              element={
                <ProtectedRoute allowedRoles={['ROLE_FIELD_OFFICER']}>
                  <ApplicationList filterAssigned={true} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/my-applications"
              element={
                <ProtectedRoute allowedRoles={['ROLE_BENEFICIARY']}>
                  <ApplicationList filterSelf={true} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/add"
              element={
                <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_BENEFICIARY']}>
                  <ApplicationForm />
                </ProtectedRoute>
              }
            />
            <Route path="/applications/:id" element={<ApplicationDetails />} />

            {/* Eligibility (Admin & Beneficiary) */}
            <Route
              path="/eligibility"
              element={
                <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_BENEFICIARY']}>
                  <Eligibility />
                </ProtectedRoute>
              }
            />

            {/* Verification (Admin & Officers) */}
            <Route
              path="/verification"
              element={
                <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_FIELD_OFFICER']}>
                  <Verification />
                </ProtectedRoute>
              }
            />
            <Route
              path="/verification/district/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ROLE_DISTRICT_OFFICER']}>
                  <DistrictDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/verification/district/reviews"
              element={
                <ProtectedRoute allowedRoles={['ROLE_DISTRICT_OFFICER']}>
                  <DistrictReviews />
                </ProtectedRoute>
              }
            />
            <Route
              path="/verification/district/verification"
              element={
                <ProtectedRoute allowedRoles={['ROLE_DISTRICT_OFFICER']}>
                  <DistrictVerification />
                </ProtectedRoute>
              }
            />
            <Route
              path="/verification/finance"
              element={
                <ProtectedRoute allowedRoles={['ROLE_FINANCE_OFFICER']}>
                  <Verification filterFinance={true} />
                </ProtectedRoute>
              }
            />

            {/* =====================================================
                FIELD OFFICER DEDICATED ROUTES
            ===================================================== */}
            <Route
              path="/field/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ROLE_FIELD_OFFICER']}>
                  <FieldOfficerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/field/assigned"
              element={
                <ProtectedRoute allowedRoles={['ROLE_FIELD_OFFICER']}>
                  <ApplicationList filterAssigned={true} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/field/verification"
              element={
                <ProtectedRoute allowedRoles={['ROLE_FIELD_OFFICER']}>
                  <Verification />
                </ProtectedRoute>
              }
            />

            {/* =====================================================
                FINANCE OFFICER DEDICATED ROUTES
            ===================================================== */}
            <Route
              path="/finance/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ROLE_FINANCE_OFFICER']}>
                  <FinanceOfficerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Disbursement & Status */}
            <Route
              path="/disbursement"
              element={
                <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_FINANCE_OFFICER']}>
                  <Disbursement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/disbursement/status"
              element={
                <ProtectedRoute allowedRoles={['ROLE_BENEFICIARY']}>
                  <Disbursement isSelfStatus={true} />
                </ProtectedRoute>
              }
            />

            {/* Compliance */}
            <Route
              path="/compliance"
              element={
                <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_FINANCE_OFFICER']}>
                  <Compliance />
                </ProtectedRoute>
              }
            />

            {/* Analytics (Admin & Finance) */}
            <Route
              path="/analytics"
              element={
                <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_FINANCE_OFFICER']}>
                  <Analytics />
                </ProtectedRoute>
              }
            />

            {/* Wildcard 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
