// src/routes/ProtectedRouteAdmin.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRouteAdmin() {
  const location = useLocation();
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="min-h-screen grid place-items-center text-white">Cargando…</div>;
  if (!user) return <Navigate to="/admin" replace state={{ from: location }} />;
  if ((profile?.role || "user") !== "admin") return <Navigate to="/" replace />;

  return <Outlet />;
}
