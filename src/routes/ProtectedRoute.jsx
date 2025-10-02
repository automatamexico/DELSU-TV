// src/routes/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, rolesAllowed }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Cargando sesión…
      </div>
    );
  }

  if (!user) {
    const redirectTo = rolesAllowed?.includes('admin') ? '/admin' : '/login';
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (Array.isArray(rolesAllowed) && rolesAllowed.length > 0) {
    const role = profile?.role || 'user';
    if (!rolesAllowed.includes(role)) {
      return (
        <div className="min-h-screen flex items-center justify-center text-red-300 p-6 text-center">
          <div>
            <div className="text-xl font-bold mb-2">Acceso denegado</div>
            <div className="opacity-80">No tienes permisos para ver esta sección.</div>
          </div>
        </div>
      );
    }
  }

  return children;
}
