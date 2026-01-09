// src/routes/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mientras AuthContext está resolviendo la sesión
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Cargando…
      </div>
    );
  }

  // Si no hay sesión, manda a /login y conserva la ruta de origen
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Autenticado → renderiza la ruta hija
  return <Outlet />;
}
