// src/pages/DashboardPage.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      // Ir al Home
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Top bar */}
      <header className="px-6 py-4 border-b border-gray-800">
        <div className="grid grid-cols-3 items-center">
          {/* Izquierda: logo */}
          <div className="flex items-center">
            <img
              src="https://uqzcnlmhmglzflkuzczk.supabase.co/storage/v1/object/public/avatars/logo_hispana_blanco.png"
              alt="Hispana TV"
              className="w-[240px] h-[100px] object-contain"
              loading="lazy"
            />
          </div>

          {/* Centro: título */}
          <h1 className="text-xl font-semibold text-center">Tablero de Control</h1>

          {/* Derecha: botón salir */}
          <div className="flex justify-end">
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
    </div>
  );
}
