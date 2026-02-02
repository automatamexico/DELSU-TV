// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

// Páginas (ajusta si tus nombres difieren)
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";

// ✅ Apps
import ChannelAppPage from "./pages/ChannelAppPage";

// Rutas protegidas
import ProtectedRoute from "./routes/ProtectedRoute";

// Error boundary
import ErrorBoundary from "./components/ErrorBoundary";

// ✅ analytics helper
import { logEvent } from "./utils/analytics";

function RouteAnalytics() {
  const location = useLocation();

  React.useEffect(() => {
    // Registra visita de página (no muestra nada)
    logEvent({ event_type: "page_view", page_path: location.pathname });
  }, [location.pathname]);

  return null;
}

export default function App() {
  React.useEffect(() => {
    console.log("[App] Montada. Si ves pantalla en blanco, revisa la consola por errores.");
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          {/* ✅ Esto no muestra nada */}
          <RouteAnalytics />

          <Routes>
            {/* Público */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* ✅ Apps (público) */}
            <Route path="/apps" element={<Navigate to="/" replace />} />
            <Route path="/apps/:id" element={<ChannelAppPage />} />

            {/* Perfil requiere sesión */}
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Admin login (la página en sí valida rol admin internamente) */}
            <Route path="/admin" element={<AdminLoginPage />} />

            {/* Dashboard: cualquier usuario autenticado */}
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
