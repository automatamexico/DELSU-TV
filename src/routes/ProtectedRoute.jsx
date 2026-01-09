// src/routes/ProtectedRoute.jsx
import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth?.() || {};

  // Mientras el contexto inicializa, no navegues ni pintes "nada".
  if (loading === true || typeof user === "undefined") {
    return <div />; // opcional: spinner mínimo
  }

  // Si no hay sesión → al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Hay sesión → deja pasar
  return <Outlet />;
}
