// src/pages/DashboardPage.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      // al cerrar sesión, lleva al login admin (cámbialo a /login si prefieres)
      navigate('/admin', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h1 className="text-xl font-semibold">Panel de Administración</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
        >
          Salir
        </button>
      </header>

      {/* Content */}
      <main className="p-6 space-y-4">
        <div className="opacity-80">UID: {user?.id || '—'}</div>
        <div className="opacity-80">Rol: {profile?.role || '—'}</div>

        <div className="mt-4">
          <p className="text-lg">
            Si ves esto, ya pasaste el guard de admin <span role="img" aria-label="ok">✅</span>
          </p>
        </div>
      </main>
    </div>
  );
}
