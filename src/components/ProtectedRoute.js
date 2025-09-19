import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles, userRole }) => {
  if (!userRole || (allowedRoles && !allowedRoles.includes(userRole))) {
    // User is not logged in or does not have the required role
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;