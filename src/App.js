// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";

import ChannelAppPage from "./pages/ChannelAppPage";

import ProtectedRoute from "./routes/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

import { logEvent } from "./utils/analytics";

function PageViewTracker() {
  const location = useLocation();

  React.useEffect(() => {
    // ✅ Cuenta visita por ruta
    logEvent({
      event_type: "page_view",
      page_path: `${location.pathname}${location.search || ""}`,
      channel_id: null,
    });
  }, [location.pathname, location.search]);

  return null;
}

export default function App() {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[App] Montada. Si ves pantalla en blanco, revisa la consola por errores.");
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <PageViewTracker />

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

            {/* Admin login */}
            <Route path="/admin" element={<AdminLoginPage />} />

            {/* Dashboard */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<HomePage />} />
          </Routes>

 {/* FOOTER */}
  <footer
    style={{
      marginTop: "40px",
      padding: "20px",
      textAlign: "center",
      background: "#111",
      color: "#fff",
    }}
  >
    <a href="/privacy.html" style={{ margin: "10px", color: "#fff" }}>
      Política de privacidad
    </a>

    <a href="/contact.html" style={{ margin: "10px", color: "#fff" }}>
      Contacto
    </a>

    <a href="/about.html" style={{ margin: "10px", color: "#fff" }}>
      Acerca de
    </a>
  </footer>

              
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
