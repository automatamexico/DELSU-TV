// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

// Páginas (ajusta si tus nombres difieren)
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";

// Rutas protegidas
import ProtectedRoute from "./routes/ProtectedRoute";
import ProtectedRouteAdmin from "./routes/ProtectedRouteAdmin";

// Error boundary
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  // Pequeño diagnóstico al montar la app
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[App] Montada. Si ves pantalla en blanco, revisa la consola por errores.");
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Público */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Perfil requiere sesión */}
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Admin */}
            <Route path="/admin" element={<AdminLoginPage />} />

            {/* Dashboard: cualquier usuario autenticado (user o admin) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
