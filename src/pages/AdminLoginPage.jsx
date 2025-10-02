// src/pages/AdminLoginPage.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Tv, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [debugOpen, setDebugOpen] = useState(false);
  const [steps, setSteps] = useState([]);

  const log = (msg) => setSteps((s) => [...s, msg]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSteps([]);

    try {
      const emailSanitized = email.trim().toLowerCase();
      log('1) Iniciando sesión…');

      // Soporta ambas firmas que has usado en tu AuthContext
      try {
        await signIn({ email: emailSanitized, password });
      } catch {
        await signIn(emailSanitized, password);
      }
      log('✔ Sesión iniciada.');

      // Usuario actual
      const { data: ures, error: getUserErr } = await supabase.auth.getUser();
      if (getUserErr) throw getUserErr;
      const uid = ures?.user?.id;
      if (!uid) throw new Error('No se pudo obtener el usuario actual.');
      log(`2) UID actual: ${uid}`);

      // UPSERT del perfil: si no existe, lo crea con defaults (role = 'user').
      // ignoreDuplicates evita pisar un perfil ya existente (por ej. admin).
      log('3) Verificando/creando perfil en user_profiles…');
      const { data: upsertData, error: upsertErr } = await supabase
        .from('user_profiles')
        .upsert([{ id: uid }], { onConflict: 'id', ignoreDuplicates: true })
        .select('role')
        .single();

      if (upsertErr) {
        // Si la RLS bloquea el upsert, intentamos al menos LEER el perfil
        log(`⚠ upsert falló: ${upsertErr.message}. Intentando solo SELECT…`);
        const { data: profMaybe, error: profSelErr } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', uid)
          .maybeSingle();

        if (profSelErr) {
          throw new Error(`No se pudo leer perfil: ${profSelErr.message}`);
        }
        if (!profMaybe) {
          throw new Error(
            'No existe fila en user_profiles y la política RLS no permite crearla. Revisa las políticas INSERT/SELECT.'
          );
        }
        // Tenemos perfil leído
        if (profMaybe.role !== 'admin') {
          await signOut();
          setErrorMsg('Tu cuenta no tiene permisos de administrador.');
          return;
        }
        log(`✔ Perfil leído. Rol = ${profMaybe.role}`);
        navigate('/dashboard', { replace: true });
        return;
      }

      // Si el upsert devolvió la fila, ya tenemos el role
      const role = upsertData?.role || 'user';
      log(`✔ Perfil ok. Rol actual: ${role}`);

      if (role !== 'admin') {
        await signOut();
        setErrorMsg('Tu cuenta no tiene permisos de administrador.');
        return;
      }

      log('4) Rol = admin → navegando a /dashboard…');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.message || 'Error al iniciar sesión.';
      setErrorMsg(msg);
      log(`✖ Error: ${msg}`);
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

        {/* Panel de detalles técnicos (puedes cerrarlo si no lo quieres ver) */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setDebugOpen((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-200 inline-flex items-center gap-1"
          >
            {debugOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {debugOpen ? 'Ocultar detalles' : 'Mostrar detalles'}
          </button>
          {debugOpen && (
            <div className="mt-2 bg-black/30 border border-gray-700 rounded-lg p-2 max-h-40 overflow-auto text-xs text-gray-300">
              {steps.length === 0 ? (
                <div className="opacity-60">Sin eventos aún…</div>
              ) : (
                steps.map((s, i) => (
                  <div key={i} className="whitespace-pre-wrap">
                    • {s}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

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
