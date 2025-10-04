import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { user, profile, loading, authError } = useAuth();
  const location = useLocation();

  // Esperar a que termine AuthContext
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Cargando sesión…
      </div>
    );
  }

  // Si hubo error de auth → ir al login admin
  if (authError) {
    return <Navigate to="/admin" replace state={{ from: location, reason: 'auth_error' }} />;
  }

  // Si no hay usuario → ir al login admin
  if (!user) {
    return <Navigate to="/admin" replace state={{ from: location, reason: 'no_user' }} />;
  }

  // Si no es admin → a inicio (o a donde prefieras)
  if (profile?.role !== 'admin') {
    return <Navigate to="/" replace state={{ reason: 'forbidden' }} />;
  }

  // OK
  return children;
}
