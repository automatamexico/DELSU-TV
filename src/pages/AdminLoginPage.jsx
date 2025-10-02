// src/pages/AdminLoginPage.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Tv, ChevronDown, ChevronUp, Clipboard } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClientCore';

function ts() {
  const d = new Date();
  return d.toISOString().replace('T', ' ').replace('Z', '');
}

export default function AdminLoginPage() {
  const { signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [debugOpen, setDebugOpen] = useState(true);
  const [steps, setSteps] = useState([]);

  // Abre el panel si viene ?debug=1
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    if (sp.get('debug') === '1') setDebugOpen(true);
  }, [location.search]);

  const addLog = (label, payload) => {
    const line = `[${ts()}] ${label}${payload !== undefined ? ` | ${safeStr(payload)}` : ''}`;
    // visible
    setSteps((prev) => [...prev, line]);
    // consola
    // eslint-disable-next-line no-console
    console.log('[AdminLogin]', line, payload);
  };

  const safeStr = (obj) => {
    try {
      if (obj === undefined) return '';
      if (typeof obj === 'string') return obj;
      return JSON.stringify(obj, null, 2)?.slice(0, 2000); // recorta
    } catch {
      return String(obj);
    }
  };

  const copyDiagnostics = async () => {
    try {
      const blob = [
        '=== Admin Login Diagnostics ===',
        `Date: ${ts()}`,
        `Email: ${email}`,
        `URL: ${window.location.href}`,
        '',
        ...steps,
      ].join('\n');
      await navigator.clipboard.writeText(blob);
      addLog('Diagnóstico copiado al portapapeles');
      alert('Diagnóstico copiado al portapapeles.');
    } catch (e) {
      alert('No se pudo copiar: ' + (e?.message || String(e)));
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSteps([]);

    // watchdog por si algo raro pasara
    let finished = false;
    const watchdog = setTimeout(() => {
      if (!finished) {
        addLog('⚠ Watchdog: la operación se está tardando demasiado (10s). Revisa red/RLS/variables.');
      }
    }, 10000);

    try {
      const emailSanitized = email.trim().toLowerCase();
      addLog('1) Iniciando sesión…', { email: emailSanitized });

      // Soporta tus dos firmas de signIn
      try {
        await signIn({ email: emailSanitized, password });
        addLog('✔ signIn (obj) OK');
      } catch (e1) {
        addLog('signIn (obj) falló, probando signIn(email, pass)…', e1?.message || String(e1));
        await signIn(emailSanitized, password);
        addLog('✔ signIn (email, pass) OK');
      }

      // Usuario actual
      const { data: ures, error: getUserErr } = await supabase.auth.getUser();
      addLog('2) auth.getUser()', { hasError: !!getUserErr, user: ures?.user?.id });
      if (getUserErr) throw getUserErr;

      const uid = ures?.user?.id;
      if (!uid) throw new Error('No se pudo obtener uid del usuario.');

      // Intento 1: leer perfil directo
      const sel1 = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', uid)
        .maybeSingle();
      addLog('3) SELECT user_profiles (maybeSingle)', {
        error: sel1.error?.message,
        data: sel1.data,
      });

      // Si hay error distinto a "no rows", lo mostramos
      if (sel1.error && sel1.error.code && sel1.error.code !== 'PGRST116') {
        throw new Error('Error leyendo perfil: ' + sel1.error.message);
      }

      let role = sel1.data?.role;

      // Si no hay fila, Intento 2: UPSERT para crearla (no pisa si ya existe)
      if (!role) {
        addLog('3.1) No hay fila de perfil → upsert({id})');
        const up = await supabase
          .from('user_profiles')
          .upsert([{ id: uid }], { onConflict: 'id', ignoreDuplicates: true })
          .select('role')
          .maybeSingle();

        addLog('3.2) Resultado upsert', { error: up.error?.message, data: up.data });

        if (up.error && up.error.code) {
          // Si RLS bloquea INSERT, al menos reintenta SELECT
          addLog('⚠ upsert bloqueado por RLS, reintentando solo SELECT…', up.error.message);
          const sel2 = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', uid)
            .maybeSingle();
          addLog('3.3) SELECT tras upsert fallido', {
            error: sel2.error?.message,
            data: sel2.data,
          });
          if (sel2.error && sel2.error.code && sel2.error.code !== 'PGRST116') {
            throw new Error('Error leyendo perfil tras upsert fallido: ' + sel2.error.message);
          }
          role = sel2.data?.role;
        } else {
          role = up.data?.role || 'user';
        }
      }

      addLog('4) Rol final detectado', { role });

      if (role !== 'admin') {
        await signOut();
        setErrorMsg('Tu cuenta no tiene permisos de administrador.');
        addLog('⛔ No es admin → signOut + mensaje');
        return;
      }

      addLog('5) Es admin → navegando a /dashboard');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.message || String(err);
      setErrorMsg(msg);
      addLog('✖ ERROR', msg);
    } finally {
      finished = true;
      clearTimeout(watchdog);
      setLoading(false);
    }
  };

  const helperNote = useMemo(
    () => (
      <div className="text-xs text-gray-400 space-y-1">
        <div>Si queda bloqueado:</div>
        <ul className="list-disc pl-4 space-y-1">
          <li>Revisa en SQL que exista la fila <code>user_profiles</code> para tu usuario.</li>
          <li>
            Verifica políticas RLS en <code>public.user_profiles</code> (SELECT/INSERT de la propia
            fila).
          </li>
          <li>Revisa variables en Netlify: <code>REACT_APP_SUPABASE_URL</code> y <code>REACT_APP_SUPABASE_ANON_KEY</code>.</li>
        </ul>
      </div>
    ),
    []
  );

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

        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setDebugOpen((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-200 inline-flex items-center gap-1"
          >
            {debugOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {debugOpen ? 'Ocultar detalles' : 'Mostrar detalles'}
          </button>

          <button
            type="button"
            onClick={copyDiagnostics}
            className="text-xs text-gray-400 hover:text-gray-200 inline-flex items-center gap-1"
            title="Copiar diagnóstico"
          >
            <Clipboard className="w-4 h-4" />
            Copiar diagnóstico
          </button>
        </div>

        {debugOpen && (
          <div className="mb-4 bg-black/30 border border-gray-700 rounded-lg p-2 max-h-40 overflow-auto text-xs text-gray-300">
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

        <div className="mt-4">{helperNote}</div>
      </motion.div>
    </div>
  );
}
