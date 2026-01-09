// src/routes/ProtectedRouteAdmin.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRouteAdmin() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // Espera a que AuthContext cargue
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Cargando…
      </div>
    );
  }

  // Si no hay sesión → login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Logged in pero no admin → dashboard (o donde tú prefieras)
  if (profile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  // Admin OK → renderiza la ruta hija
  return <Outlet />;
}
