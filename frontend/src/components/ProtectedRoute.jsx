import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRole } from '../layouts/ProtectedLayout';
import Forbidden from './Forbidden';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, allowedRoles }) {
  const auth = useRole();

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  const { token, activeRole, loading } = auth;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(activeRole)) {
    return <Forbidden />;
  }

  return children;
}
