// src/pages/AdminLoginPage.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Tv } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClientCore';

export default function AdminLoginPage() {
  const { signIn, signOut } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Pequeño helper: intenta leer user_profiles varias veces
  const fetchProfileWithRetry = async (uid, tries = 8, delayMs = 300) => {
    for (let i = 0; i < tries; i++) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', uid)
        .maybeSingle(); // no lanza error si no hay fila

      if (data) return data; // { role: 'user' | 'admin' }

      // Si hay error de "no encontrado", reintenta; otros errores los mostramos
      if (error && error.code && error.code !== 'PGRST116') {
        throw error;
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return null;
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const emailSanitized = email.trim().toLowerCase();

      // Inicia sesión (soporta ambas firmas que usas en AuthContext)
      try {
        await signIn({ email: emailSanitized, password });
      } catch {
        await signIn(emailSanitized, password);
      }

      // Obtén el usuario autenticado
      const { data: ures, error: getUserErr } = await supabase.auth.getUser();
      if (getUserErr) throw getUserErr;
      const uid = ures?.user?.id;
      if (!uid) throw new Error('No se pudo obtener el usuario actual.');

      // Lee el perfil (con reintentos, por si el trigger tarda en crear la fila)
      const prof = await fetchProfileWithRetry(uid, 10, 350);
      if (!prof) {
        // Si después de reintentar no hay perfil, salimos
        await signOut();
        throw new Error(
          'No se encontró tu perfil en user_profiles. Verifica el trigger de creación o crea la fila manualmente.'
        );
      }

      if (prof.role !== 'admin') {
        await signOut();
        setErrorMsg('Tu cuenta no tiene permisos de administrador.');
        return;
      }

      // OK → al dashboard
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrorMsg(err?.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4 text-white">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-800/70 backdrop-blur-lg border border-gray-700 rounded-2xl p-8 shadow-2xl w-full max-w-md"
      >
        <div className="flex justify-center mb-6">
          <Tv className="w-16 h-16 text-red-500" />
        </div>

        <h2 className="text-3xl font-bold text-center mb-2">Acceso Administrador</h2>
        <p className="text-center text-gray-400 mb-6 text-sm">
          Ingresa con una cuenta con permisos de administrador.
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-gray-300 text-sm font-medium mb-2">
              Correo
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="admin@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-300 text-sm font-medium mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Min 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <LogIn className="w-5 h-5" />
            {loading ? 'Procesando…' : 'Entrar'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
