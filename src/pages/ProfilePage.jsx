// src/pages/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, profile, uploadAvatar, updateProfile, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Sincroniza formularios cuando cambie el perfil
  useEffect(() => {
    setFullName(profile?.full_name || '');
    setCountry(profile?.country || '');
  }, [profile?.full_name, profile?.country]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      await uploadAvatar(file);
      alert('Avatar actualizado.');
    } catch (err) {
      console.error('[UI] upload avatar:', err);
      alert('Error al subir avatar: ' + (err?.message || String(err)));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateProfile({ fullName, country });
      alert('Perfil actualizado.');
    } catch (err) {
      console.error('[UI] update profile:', err);
      alert('Error al guardar: ' + (err?.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Cargando perfil…</div>;
  }

  const avatarSrc =
    profile?.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile?.full_name || user?.email || 'U')}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="max-w-2xl mx-auto p-6">
        <motion.h1
          className="text-3xl font-bold mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Mi Perfil
        </motion.h1>

        <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6">
          <div className="flex items-center gap-6 mb-6">
            <img
              src={avatarSrc}
              alt="Avatar"
              className="w-20 h-20 rounded-full object-cover border border-gray-700"
            />
            <div>
              <div className="text-sm text-gray-400">Correo</div>
              <div className="font-medium">{user?.email}</div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Nombre</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">País</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="México"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Avatar</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={uploading}
                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-600 file:text-white hover:file:bg-red-700"
              />
              {uploading && <div className="text-xs text-gray-400 mt-1">Subiendo avatar…</div>}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded-lg font-semibold disabled:opacity-60"
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

