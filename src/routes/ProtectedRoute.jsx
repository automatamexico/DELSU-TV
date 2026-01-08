// src/routes/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const location = useLocation();
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen grid place-items-center text-white">Cargando…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
}
