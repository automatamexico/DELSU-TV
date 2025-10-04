import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PublicOnlyRoute({ children }) {
  const { user, profile, loading } = useAuth();

  // Mientras carga, muestra el contenido público (o un loader)
  if (loading) return children;

  if (user) {
    // Si está logueado, decide a dónde mandarlo
    if (profile?.role === 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Usuario no logueado → puede ver la página pública
  return children;
}
