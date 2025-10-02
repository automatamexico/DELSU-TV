// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import ProtectedRoute from './routes/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';

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
            Verifica REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY y las URLs de Supabase Auth.
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
            {/* Login normal (usuarios) */}
            <Route path="/login" element={<LoginPage />} />

            {/* Login admin separado */}
            <Route path="/admin" element={<AdminLoginPage />} />

            {/* Panel admin (solo admin). Si no hay sesión o no es admin → /admin */}
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute requireRole="admin" redirectTo="/admin">
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Home (solo usuarios logueados). Si no hay sesión → /login */}
            <Route
              path="/"
              element={
                <ProtectedRoute redirectTo="/login">
                  <HomePage />
                </ProtectedRoute>
              }
            />

            {/* (Opcional) 404 simple */}
            <Route
              path="*"
              element={
                <div className="min-h-screen flex items-center justify-center text-white">
                  404
                </div>
              }
            />
          </Routes>
        </AuthStatusGate>
      </BrowserRouter>
    </AuthProvider>
  );
}

