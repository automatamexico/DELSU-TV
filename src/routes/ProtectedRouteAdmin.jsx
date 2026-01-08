// src/routes/ProtectedRouteAdmin.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRouteAdmin({ children }) {
  // Hooks SIEMPRE arriba
  const location = useLocation();
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-300">
        Cargando…
      </div>
    );
  }

  if (!user) {
    // no logueado → al login admin
    return <Navigate to="/admin" replace state={{ from: location }} />;
  }

  const role = profile?.role || "user";
  if (role !== "admin") {
    // logueado pero sin permisos
    return <Navigate to="/" replace />;
  }

  return children;
}
