// src/routes/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth?.() || {};

  // Mientras AuthContext resuelve sesión, no parpadees la UI.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-300">
        Cargando…
      </div>
    );
  }

  const location = useLocation();

  // Si no hay sesión, manda al login de la app
  if (!user) {
    return <Navigate to="/app" replace state={{ from: location }} />;
  }

  return children;
}
