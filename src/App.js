// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login general */}
          <Route path="/login" element={<LoginPage />} />

          {/* Login exclusivo para administradores */}
          <Route path="/admin" element={<AdminLoginPage />} />
          {/* Alias con D mayúscula como pediste */}
          <Route path="/Dashboard" element={<AdminLoginPage />} />

          {/* Panel: solo admins */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute rolesAllowed={['admin']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Perfil (usuario autenticado de cualquier rol) */}
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Home: requiere login si así lo quieres; si no, quita ProtectedRoute */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />

          {/* Fallback opcional */}
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
