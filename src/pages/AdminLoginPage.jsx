// src/pages/AdminLoginPage.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Tv } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // Solo importamos supabase (ya no SB_URL aquí)

// Determina la URL de Supabase aquí (sin depender de exports)
const ENV_URL = process.env.REACT_APP_SUPABASE_URL?.trim();
const FALLBACK_URL = 'https://uqzcnlmhmglzflkuzczk.supabase.co'; // tu URL de respaldo
const SB_URL = ENV_URL || FALLBACK_URL;

const ts = () => new Date().toISOString().replace('T', ' ').replace('Z', '');

async function withTimeout(promise, ms, label = 'operación') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout ${label} (${ms}ms)`)), ms);
  });
  try {
    const res = await Promise.race([promise, timeout]);
    clearTimeout(timer);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// Preflight de conectividad a Supabase Auth
async function preflightAuth() {
  const health = `${SB_URL}/auth/v1/health`;
  const res = await withTimeout(fetch(health, { method: 'GET', mode: 'cors' }), 6000, 'preflight');
  if (!res.ok) {
    const alt = await withTimeout(fetch(`${SB_URL}/auth/v1/settings`, { method: 'GET', mode: 'cors' }), 6000, 'preflight2');
    return alt.ok;
  }
  return true;
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [steps, setSteps] = useState([
    `[${ts()}] Página /admin montada | { "path": "${location.pathname}", "query": "${location.search || ''}" }`
  ]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const log = (label, data) => {
    const line = `[${ts()}] ${label}${data !== undefined ? ` | ${safe(data)}` : ''}`;
    setSteps(s => [...s, line]);
    // eslint-disable-next-line no-console
    console.log('[AdminBare]', line, data);
  };
  const safe = (obj) => {
    try {
      if (obj === undefined) return '';
      if (typeof obj === 'string') return obj;
      return JSON.stringify(obj, null, 2)?.slice(0, 2000);
    } catch {
      return String(obj);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    setSteps([]);

    try {
      // 0) Preflight
      log('0) Preflight a Supabase Auth', { SB_URL });
      try {
        const ok = await preflightAuth();
        log('0.1) Preflight resultado', { ok });
        if (!ok) throw new Error('Preflight a Supabase no OK. Posible CSP/CORS.');
      } catch (pfErr) {
        throw new Error(
          `No se pudo conectar a Supabase Auth (${SB_URL}). ` +
          `Revisa Content-Security-Policy (connect-src) en netlify.toml. Detalle: ${pfErr.message}`
        );
      }

      const emailSan = email.trim().toLowerCase();
      log('1) signInWithPassword…', { email: emailSan });

      const { data: signData, error: signErr } = await withTimeout(
        supabase.auth.signInWithPassword({ email: emailSan, password }),
        10000,
        'signInWithPassword'
      );
      log('1.1) signIn result', { error: signErr?.message, user: signData?.user?.id });
      if (signErr) throw new Error(signErr.message || 'No se pudo iniciar sesión');

      const { data: ures, error: getUserErr } = await withTimeout(
        supabase.auth.getUser(),
        8000,
        'getUser'
      );
      log('2) getUser', { error: getUserErr?.message, user: ures?.user?.id });
      if (getUserErr) throw getUserErr;
      const uid = ures?.user?.id;
      if (!uid) throw new Error('No se obtuvo UID');

      const { data: prof, error: selErr } = await withTimeout(
        supabase.from('user_profiles').select('role').eq('id', uid).maybeSingle(),
        8000,
        'select profile'
      );
      log('3) SELECT user_profiles', { error: selErr?.message, data: prof });
      if (selErr && selErr.code && selErr.code !== 'PGRST116') {
        throw new Error('Error leyendo perfil: ' + selErr.message);
      }

      let role = prof?.role;
      if (!role) {
        log('3.1) No hay fila → upsert({id})');
        const up = await withTimeout(
          supabase.from('user_profiles')
            .upsert([{ id: uid }], { onConflict: 'id', ignoreDuplicates: true })
            .select('role')
            .maybeSingle(),
          8000,
          'upsert profile'
        );
        log('3.2) upsert result', { error: up.error?.message, data: up.data });
        if (up.error && up.error.code) {
          throw new Error('RLS bloqueó el upsert. Revisa políticas INSERT/SELECT.');
        }
        role = up.data?.role || 'user';
      }

      log('4) Rol final', { role });

      if (role !== 'admin') {
        setErr('Tu cuenta no tiene permisos de administrador.');
        await supabase.auth.signOut();
        return;
      }

      log('5) OK admin → /dashboard');
      navigate('/dashboard', { replace: true });
    } catch (e2) {
      setErr(e2?.message || String(e2));
      log('✖ ERROR', e2?.message || String(e2));
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
          Este login prueba conectividad a Supabase y luego inicia sesión.
        </p>

        {err && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {err}
          </div>
        )}

        <div className="mb-3 bg-black/30 border border-gray-700 rounded-lg p-2 max-h-32 overflow-auto text-xs text-gray-300">
          {steps.length === 0 ? (
            <div className="opacity-60">Sin eventos aún…</div>
          ) : (
            steps.map((s, i) => (
              <div key={i} className="whitespace-pre-wrap">• {s}</div>
            ))
          )}
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-gray-300 text-sm font-medium mb-2">Correo</label>
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
            <label htmlFor="password" className="block text-gray-300 text-sm font-medium mb-2">Contraseña</label>
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

