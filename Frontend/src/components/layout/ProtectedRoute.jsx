// src/components/layout/ProtectedRoute.jsx
import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useSystemStore } from '../../store/useSystemStore';
import MaintenanceOverlay from '../common/MaintenanceOverlay';

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, role } = useAuthStore();
  const { isMaintenanceMode, fetchMaintenanceStatus } = useSystemStore();

  useEffect(() => {
    fetchMaintenanceStatus();
  }, [fetchMaintenanceStatus]);

  // 1. Unauthenticated -> Redirect to Login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 2. Global Maintenance Mode Active -> Block non-admin users
  if (isMaintenanceMode && role !== 'admin') {
    return <MaintenanceOverlay />;
  }

  // 3. Unauthorized Role -> Redirect strictly according to role privileges
  if (allowedRoles && !allowedRoles.includes(role)) {
    return role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;