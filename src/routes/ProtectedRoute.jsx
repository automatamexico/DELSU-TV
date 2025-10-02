// src/routes/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({
  children,
  requireRole = null,   // 'admin' si quieres forzar rol
  redirectTo = '/login', // hacia dónde redirigir si no hay sesión
}) {
  const { loading, session, profile } = useAuth();
  const location = useLocation();

  // Mientras AuthContext negocia la sesión / perfil, mostramos un loader
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Cargando sesión…
      </div>
    );
  }

  // Si no hay sesión, fuera
  if (!session) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Si exige rol y no coincide, fuera
  if (requireRole && profile?.role !== requireRole) {
    // Puedes mandarlo a /admin si la ruta es admin
    const fallback = requireRole === 'admin' ? '/admin' : '/login';
    return <Navigate to={fallback} replace state={{ from: location }} />;
  }

  return children;
}


