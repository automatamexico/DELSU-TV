// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import ProtectedRoute from './routes/ProtectedRoute';
import PublicOnlyRoute from './routes/PublicOnlyRoute';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Primero mostramos el login si NO hay sesión */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />

          {/* Todo el sitio protegido */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />

          {/* Ejemplo: dashboard solo para admin */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute requireRole="admin">
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Cualquier ruta desconocida va al inicio (protegido) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
