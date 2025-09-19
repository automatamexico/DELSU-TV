// src/routes/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mientras carga la sesión, no redirigir (evita bucles)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Cargando…
      </div>
    );
  }

  // Si no hay usuario, enviar a /login guardando a dónde iba
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
