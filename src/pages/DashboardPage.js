// src/pages/DashboardPage.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { profile, user } = useAuth();

  return (
    <div className="min-h-screen text-white p-6">
      <h1 className="text-2xl font-bold mb-2">Panel de Administración</h1>
      <div className="opacity-80 mb-4">
        UID: {user?.id} — Rol: {profile?.role || '—'}
      </div>
      <p>Si ves esto, ya pasaste el guard de admin ✅</p>
    </div>
  );
}
