// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminRoute from './routes/AdminRoute';     // ✅ nuevo guardia solo-admin
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';

const AuthStatusGate = ({ children }) => {
  const { loading, authError } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Cargando sesión…
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-300 p-6 text-center">
        <div>
          <div className="text-xl font-bold mb-2">Error de autenticación</div>
          <div className="opacity-80">{authError}</div>
          <div className="mt-4 text-sm opacity-70">
            Verifica tus variables en Netlify (REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY)
            y la configuración de URLs en Supabase Auth.
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthStatusGate>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* 🔒 Solo admins pueden entrar al dashboard */}
            <Route
              path="/dashboard/*"
              element={
                <AdminRoute>
                  <DashboardPage />
                </AdminRoute>
              }
            />

            {/* Rutas públicas */}
            <Route path="/" element={<HomePage />} />
          </Routes>
        </AuthStatusGate>
      </BrowserRouter>
    </AuthProvider>
  );
}
