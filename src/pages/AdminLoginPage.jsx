// src/pages/AdminLoginPage.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Tv, Upload, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

// ========= ICONOS (AJUSTA ESTAS URLS A TU STORAGE) =========
const BASE = 'https://uqzcnlmhmglzflkuzczk.supabase.co/storage/v1/object/public';
const ICON_URLS = {
  roku:    `${BASE}/icons/roku.png`,
  youtube: `${BASE}/icons/youtube.png`,
  facebook:`${BASE}/icons/facebook.png`,
  tiktok:  `${BASE}/icons/tiktok.png`,
  website: `${BASE}/icons/web.png`,
};
// ===========================================================

// Determina la URL de Supabase sin depender de exports adicionales
const ENV_URL = process.env.REACT_APP_SUPABASE_URL?.trim();
const FALLBACK_URL = 'https://uqzcnlmhmglzflkuzczk.supabase.co';
const SB_URL = ENV_URL || FALLBACK_URL;

const ts = () => new Date().toISOString().replace('T', ' ').replace('Z', '');
function safe(obj) {
  try {
    if (obj === undefined) return '';
    if (typeof obj === 'string') return obj;
    return JSON.stringify(obj, null, 2)?.slice(0, 2000);
  } catch { return String(obj); }
}
async function withTimeout(promise, ms, label = 'operación') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout ${label} (${ms}ms)`)), ms);
  });
  try {
    const res = await Promise.race([promise, timeout]);
    clearTimeout(timer);
    return res;
  } finally { clearTimeout(timer); }
}
async function preflightAuthRelaxed() {
  const details = { ok: false, tried: [] };
  const tryFetch = async (path, label) => {
    try {
      const url = `${SB_URL}${path}`;
      const res = await withTimeout(fetch(url, { method: 'GET', mode: 'cors' }), 6000, label);
      details.tried.push({ path, status: res.status });
      if (res.ok) details.ok = true;
    } catch (e) {
      details.tried.push({ path, error: e.message || String(e) });
    }
  };
  await tryFetch('/auth/v1/health', 'preflight:health');
  if (!details.ok) await tryFetch('/auth/v1/settings', 'preflight:settings');
  return details; // informativo
}

/* =========================
   FORMULARIO ALTA DE CANAL
   ========================= */
function AdminChannelForm() {
  const [form, setForm] = useState({
    name: '',
    country: '',
    description: '',
    category: '',
    posterFile: null,

    rokuEnabled: false,
    roku_link_url: '',

    youtubeEnabled: false,
    youtube_url: '',

    facebookEnabled: false,
    facebook_url: '',

    tiktokEnabled: false,
    tiktok_url: '',

    websiteEnabled: false,
    website_url: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const onChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      setForm((s) => ({ ...s, posterFile: files?.[0] || null }));
    } else if (type === 'checkbox') {
      setForm((s) => ({ ...s, [name]: checked }));
    } else {
      setForm((s) => ({ ...s, [name]: value }));
    }
  };

  const uploadPoster = async (file) => {
    if (!file) return null;
    const path = `posters/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const up = await supabase.storage.from('avatars').upload(path, file, {
      cacheControl: '0',
      upsert: true,
    });
    if (up.error) throw up.error;
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    return pub?.publicUrl || null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setSubmitting(true);
    try {
      // 1) Subir póster si hay
      let posterUrl = null;
      if (form.posterFile) {
        posterUrl = await uploadPoster(form.posterFile);
      }

      // 2) Preparar payload para la tabla channels
      const payload = {
        // mapea los campos que pediste
        name: form.name.trim(),
        country: form.country.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        poster: posterUrl, // ← guarda el URL del póster en 'poster'
      };

      // Roku
      if (form.rokuEnabled) {
        payload.roku_icon_url = ICON_URLS.roku; // ícono común
        payload.roku_link_url = form.roku_link_url?.trim() || null;
      } else {
        payload.roku_icon_url = null;
        payload.roku_link_url = null;
      }

      // YouTube
      if (form.youtubeEnabled) {
        payload.youtube_icon_url = ICON_URLS.youtube;
        payload.youtube_url = form.youtube_url?.trim() || null;
      } else {
        payload.youtube_icon_url = null;
        payload.youtube_url = null;
      }

      // Facebook
      if (form.facebookEnabled) {
        payload.facebook_icon_url = ICON_URLS.facebook;
        payload.facebook_url = form.facebook_url?.trim() || null;
      } else {
        payload.facebook_icon_url = null;
        payload.facebook_url = null;
      }

      // TikTok
      if (form.tiktokEnabled) {
        payload.tiktok_icon_url = ICON_URLS.tiktok;
        payload.tiktok_url = form.tiktok_url?.trim() || null;
      } else {
        payload.tiktok_icon_url = null;
        payload.tiktok_url = null;
      }

      // Website
      if (form.websiteEnabled) {
        payload.website_icon_url = ICON_URLS.website;
        payload.website_url = form.website_url?.trim() || null;
      } else {
        payload.website_icon_url = null;
        payload.website_url = null;
      }

      // 3) Insertar
      const { error } = await supabase.from('channels').insert([payload]);
      if (error) throw error;

      setMsg('✅ Canal creado correctamente.');
      // limpia el formulario mínimamente
      setForm((s) => ({
        ...s,
        name: '',
        country: '',
        description: '',
        category: '',
        posterFile: null,
        rokuEnabled: false,
        roku_link_url: '',
        youtubeEnabled: false,
        youtube_url: '',
        facebookEnabled: false,
        facebook_url: '',
        tiktokEnabled: false,
        tiktok_url: '',
        websiteEnabled: false,
        website_url: '',
      }));
    } catch (err) {
      setMsg(`❌ Error: ${err.message || String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8 bg-gray-800/70 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="w-5 h-5 text-rose-400" />
        <h3 className="text-xl font-semibold">Alta de nuevo canal</h3>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          msg.startsWith('✅') ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-200'
                               : 'bg-red-900/40 border border-red-700 text-red-200'
        }`}>
          {msg}
        </div>
      )}

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Nombre */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Nombre del canal</label>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="Ej. Vision M"
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            required
          />
        </div>

        {/* País */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">País</label>
          <input
            name="country"
            value={form.country}
            onChange={onChange}
            placeholder="Ej. México"
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            required
          />
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Categoría</label>
          <input
            name="category"
            value={form.category}
            onChange={onChange}
            placeholder="Noticias / Entretenimiento / Música..."
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            required
          />
        </div>

        {/* Poster */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Póster</label>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 bg-gray-700/50 border border-gray-600 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-700">
              <Upload className="w-4 h-4" />
              <span>Subir imagen</span>
              <input
                type="file"
                accept="image/*"
                onChange={onChange}
                name="posterFile"
                className="hidden"
              />
            </label>
            <span className="text-xs text-gray-400 truncate max-w-[240px]">
              {form.posterFile ? form.posterFile.name : 'Sin archivo seleccionado'}
            </span>
          </div>
        </div>

        {/* Descripción (columna completa) */}
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-300 mb-1">Descripción del canal</label>
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            rows={3}
            placeholder="Describe brevemente el canal…"
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          />
        </div>

        {/* ======= Roku ======= */}
        <div className="md:col-span-2 border-t border-gray-700 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input
              id="rokuEnabled"
              name="rokuEnabled"
              type="checkbox"
              checked={form.rokuEnabled}
              onChange={onChange}
              className="h-4 w-4"
            />
            <label htmlFor="rokuEnabled" className="text-sm text-gray-200 font-medium">
              Roku (usar ícono común y capturar URL del canal en Roku)
            </label>
          </div>
          {form.rokuEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">URL de Roku</label>
                <input
                  name="roku_link_url"
                  value={form.roku_link_url}
                  onChange={onChange}
                  placeholder="https://channelstore.roku.com/..."
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
              </div>
              <div className="text-xs text-gray-400 flex items-end">
                Ícono que se guardará: <span className="ml-2 underline break-all">{ICON_URLS.roku}</span>
              </div>
            </div>
          )}
        </div>

        {/* ======= Redes ======= */}
        <div className="md:col-span-2 border-t border-gray-700 pt-4 space-y-5">
          {/* YouTube */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <input
                id="youtubeEnabled"
                name="youtubeEnabled"
                type="checkbox"
                checked={form.youtubeEnabled}
                onChange={onChange}
                className="h-4 w-4"
              />
              <label htmlFor="youtubeEnabled" className="text-sm text-gray-200 font-medium">
                YouTube
              </label>
            </div>
            {form.youtubeEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  name="youtube_url"
                  value={form.youtube_url}
                  onChange={onChange}
                  placeholder="https://youtube.com/@tu-canal"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
                <div className="text-xs text-gray-400 flex items-end">
                  Ícono: <span className="ml-2 underline break-all">{ICON_URLS.youtube}</span>
                </div>
              </div>
            )}
          </div>

          {/* Facebook */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <input
                id="facebookEnabled"
                name="facebookEnabled"
                type="checkbox"
                checked={form.facebookEnabled}
                onChange={onChange}
                className="h-4 w-4"
              />
              <label htmlFor="facebookEnabled" className="text-sm text-gray-200 font-medium">
                Facebook
              </label>
            </div>
            {form.facebookEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  name="facebook_url"
                  value={form.facebook_url}
                  onChange={onChange}
                  placeholder="https://facebook.com/tu-pagina"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
                <div className="text-xs text-gray-400 flex items-end">
                  Ícono: <span className="ml-2 underline break-all">{ICON_URLS.facebook}</span>
                </div>
              </div>
            )}
          </div>

          {/* TikTok */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <input
                id="tiktokEnabled"
                name="tiktokEnabled"
                type="checkbox"
                checked={form.tiktokEnabled}
                onChange={onChange}
                className="h-4 w-4"
              />
              <label htmlFor="tiktokEnabled" className="text-sm text-gray-200 font-medium">
                TikTok
              </label>
            </div>
            {form.tiktokEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  name="tiktok_url"
                  value={form.tiktok_url}
                  onChange={onChange}
                  placeholder="https://www.tiktok.com/@tu-cuenta"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
                <div className="text-xs text-gray-400 flex items-end">
                  Ícono: <span className="ml-2 underline break-all">{ICON_URLS.tiktok}</span>
                </div>
              </div>
            )}
          </div>

          {/* Website */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <input
                id="websiteEnabled"
                name="websiteEnabled"
                type="checkbox"
                checked={form.websiteEnabled}
                onChange={onChange}
                className="h-4 w-4"
              />
              <label htmlFor="websiteEnabled" className="text-sm text-gray-200 font-medium">
                Sitio web
              </label>
            </div>
            {form.websiteEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  name="website_url"
                  value={form.website_url}
                  onChange={onChange}
                  placeholder="https://tusitio.com"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
                <div className="text-xs text-gray-400 flex items-end">
                  Ícono: <span className="ml-2 underline break-all">{ICON_URLS.website}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 px-5 py-2.5 rounded-lg font-semibold"
          >
            <Plus className="w-5 h-5" />
            {submitting ? 'Guardando…' : 'Crear canal'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================
   PÁGINA (LOGIN + FORM ADMIN)
   ========================= */
export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, profile, signOut } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [steps, setSteps] = useState([
    `[${ts()}] Página /admin montada | { "path": "${location.pathname}", "query": "${location.search || ''}" }`
  ]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const log = (label, data) => {
    const line = `[${ts()}] ${label}${data !== undefined ? ` | ${safe(data)}` : ''}`;
    setSteps((s) => [...s, line]);
    // eslint-disable-next-line no-console
    console.log('[Admin]', line, data);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    setSteps([]);

    const emailSan = email.trim().toLowerCase();
    log('CLICK Entrar recibido', { email: emailSan });

    try {
      log('0) Preflight relajado a Supabase Auth', { SB_URL });
      const pf = await preflightAuthRelaxed();
      log('0.1) Preflight info', pf);

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

      let role = prof?.role || 'user';
      log('4) Rol final', { role });

      if (role !== 'admin') {
        setErr('Tu cuenta no tiene permisos de administrador.');
        await supabase.auth.signOut();
        return;
      }

      // Si es admin, simplemente permanece en /admin y verá el formulario.
      log('5) OK admin: mostrar formulario en esta misma página.');
    } catch (e2) {
      setErr(e2?.message || String(e2));
      log('✖ ERROR', e2?.message || String(e2));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/admin', { replace: true });
  };

  // Si ya es admin, mostramos directamente el formulario de alta
  if (user && profile?.role === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">
        <header className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <Tv className="w-7 h-7 text-rose-500" />
            <h2 className="text-2xl font-bold">Admin: Alta de canales</h2>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
          >
            Salir
          </button>
        </header>

        <AdminChannelForm />
      </div>
    );
  }

  // Si NO es admin, renderiza el login (igual que antes)
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

