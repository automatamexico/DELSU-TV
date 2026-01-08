// src/routes/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  // Hooks SIEMPRE arriba, nunca dentro de condicionales
  const location = useLocation();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-300">
        Cargando…
      </div>
    );
  }

  if (!user) {
    // no hay sesión → al login de la app
    return <Navigate to="/app" replace state={{ from: location }} />;
  }

  return children;
}
