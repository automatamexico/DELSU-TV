// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";

// Si ya tienes estos wrappers, mantenlos.
// Protege rutas para usuarios logueados y para admins.
import ProtectedRoute from "./routes/ProtectedRoute";
import ProtectedRouteAdmin from "./routes/ProtectedRouteAdmin";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Público: login de la app y home (home pide login si usas ProtectedRoute en HomePage) */}
          <Route path="/app" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />

          {/* Admin: login y dashboard protegido por rol */}
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRouteAdmin>
                <DashboardPage />
              </ProtectedRouteAdmin>
            }
          />

          {/* Perfil: requiere estar autenticado (cualquier rol) */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
