import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading, authError } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Cargando sesión…
      </div>
    );
  }

  if (authError) {
    return <Navigate to="/login" replace state={{ from: location, reason: 'auth_error' }} />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location, reason: 'no_user' }} />;
  }

  return children;
}

