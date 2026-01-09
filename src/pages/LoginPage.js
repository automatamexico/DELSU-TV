// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);

    try {
      // 1) login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw new Error(error.message || 'No se pudo iniciar sesión');

      const uid = data?.user?.id;
      if (!uid) throw new Error('No se obtuvo el usuario');

      // 2) leer rol desde user_profiles
      const { data: prof, error: profErr } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', uid)
        .maybeSingle();

      if (profErr) throw new Error(profErr.message || 'Error leyendo perfil');

      const role = prof?.role || 'user';

      // 3) redirección por rol
      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4 text-white">
      <div className="bg-gray-800/70 backdrop-blur-lg border border-gray-700 rounded-2xl p-8 shadow-2xl w-full max-w-md">
        {/* Logo arriba del título */}
        <div className="flex justify-center mb-4">
          <img
            src="https://uqzcnlmhmglzflkuzczk.supabase.co/storage/v1/object/public/avatars/logo_hispana_blanco.png"
            alt="Hispana TV"
            className="w-[240px] h-[100px] object-contain"
            loading="lazy"
          />
        </div>

        <h2 className="text-3xl font-bold text-center mb-2">Iniciar sesión</h2>
        <p className="text-center text-gray-400 mb-6 text-sm">
          Ingresa con tu correo y contraseña.
        </p>

        {err && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {err}
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-gray-300 text-sm font-medium mb-2">Correo</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="tucorreo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-300 text-sm font-medium mb-2">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300"
          >
            <LogIn className="w-5 h-5" />
            {loading ? 'Procesando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
