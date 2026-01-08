// src/routes/ProtectedRouteAdmin.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRouteAdmin({ children }) {
  const { user, profile, loading } = useAuth?.() || {};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-300">
        Cargando…
      </div>
    );
  }

  const location = useLocation();

  // No logueado → al login admin
  if (!user) {
    return <Navigate to="/admin" replace state={{ from: location }} />;
  }

  // Logueado pero sin rol admin → a Home
  const role = profile?.role || "user";
  if (role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}
