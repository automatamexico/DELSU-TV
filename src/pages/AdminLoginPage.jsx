// src/pages/AdminLoginPage.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Tv, Upload, Plus, PauseCircle, PlayCircle, AlertTriangle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

// ========= ICONOS (AJUSTA ESTAS URLS A TU STORAGE) =========
const ICON_URLS = {
  roku:    'https://uqzcnlmhmglzflkuzczk.supabase.co/storage/v1/object/public/avatars/roku.png',
  youtube: 'https://uqzcnlmhmglzflkuzczk.supabase.co/storage/v1/object/public/avatars/logo_youtube.png',
  facebook:'https://uqzcnlmhmglzflkuzczk.supabase.co/storage/v1/object/public/avatars/logo_fb.png',
  tiktok:  'https://uqzcnlmhmglzflkuzczk.supabase.co/storage/v1/object/public/avatars/logo_tiktok.png',
  website: 'https://uqzcnlmhmglzflkuzczk.supabase.co/storage/v1/object/public/avatars/logo_web.png',
};
// ===========================================================

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
  return details;
}

/* =========================
   PANEL: Suspender canal
   ========================= */
function SuspendChannelPanel() {
  const [channels, setChannels] = useState([]);
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const reload = async () => {
    const { data, error } = await supabase
      .from('channels')
      .select('id,name,country,is_suspended')
      .eq('is_suspended', false)
      .order('name', { ascending: true })
      .limit(300);
    if (error) setMsg(`❌ Error: ${error.message}`);
    else setChannels(data || []);
  };

  useEffect(() => { reload(); }, []);

  const filtered = channels.filter(c =>
    (c.name || '').toLowerCase().includes(filter.toLowerCase()) ||
    (c.country || '').toLowerCase().includes(filter.toLowerCase())
  );

  const suspendNow = async () => {
    if (!selectedId) return;
    setLoading(true);
    setMsg('');
    try {
      const { error } = await supabase
        .from('channels')
        .update({ is_suspended: true, suspended_at: new Date().toISOString() })
        .eq('id', selectedId);
      if (error) throw error;
      setMsg('✅ Canal suspendido.');
      setSelectedId('');
      setConfirmOpen(false);
      reload();
    } catch (e) {
      setMsg(`❌ ${e.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 bg-gray-800/70 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <PauseCircle className="w-5 h-5 text-amber-400" />
        <h3 className="text-xl font-semibold">Suspender canal</h3>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          msg.startsWith('✅') ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-200'
                               : 'bg-red-900/40 border border-red-700 text-red-200'
        }`}>{msg}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Buscar canal</label>
          <input
            value={filter}
            onChange={(e)=>setFilter(e.target.value)}
            placeholder="Nombre o país…"
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Canal activo</label>
          <select
            value={selectedId}
            onChange={(e)=>setSelectedId(e.target.value)}
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          >
            <option value="">— Selecciona —</option>
            {filtered.map(c=>(
              <option key={c.id} value={c.id}>{c.name}{c.country?` (${c.country})`:''}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            disabled={!selectedId || loading}
            onClick={()=>setConfirmOpen(true)}
            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 px-5 py-2.5 rounded-lg font-semibold"
          >
            <AlertTriangle className="w-4 h-4" />
            Suspender canal
          </button>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-[min(480px,92vw)]">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              <h4 className="text-lg font-semibold">¿Desea suspender este canal?</h4>
            </div>
            <p className="text-sm text-gray-300 mb-5">
              El canal se ocultará del Home hasta que lo habilites.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={()=>setConfirmOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={suspendNow}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   PANEL: Canales suspendidos (rehabilitar)
   ========================= */
function SuspendedChannelsPanel() {
  const [channels, setChannels] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const reload = async () => {
    const { data, error } = await supabase
      .from('channels')
      .select('id,name,country,suspended_at')
      .eq('is_suspended', true)
      .order('name', { ascending: true })
      .limit(300);
    if (error) setMsg(`❌ Error: ${error.message}`);
    else setChannels(data || []);
  };

  useEffect(()=>{ reload(); },[]);

  const enableNow = async () => {
    if (!selectedId) return;
    setLoading(true);
    setMsg('');
    try {
      const { error } = await supabase
        .from('channels')
        .update({ is_suspended: false, suspended_at: null })
        .eq('id', selectedId);
      if (error) throw error;
      setMsg('✅ Canal habilitado.');
      setSelectedId('');
      reload();
    } catch (e) {
      setMsg(`❌ ${e.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 bg-gray-800/70 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <PlayCircle className="w-5 h-5 text-emerald-400" />
        <h3 className="text-xl font-semibold">Canales suspendidos</h3>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          msg.startsWith('✅') ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-200'
                               : 'bg-red-900/40 border border-red-700 text-red-200'
        }`}>{msg}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-300 mb-1">Selecciona un canal</label>
          <select
            value={selectedId}
            onChange={(e)=>setSelectedId(e.target.value)}
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          >
            <option value="">— Selecciona —</option>
            {channels.map(c=>(
              <option key={c.id} value={c.id}>
                {c.name}{c.country?` (${c.country})`:''} {c.suspended_at ? `— ${new Date(c.suspended_at).toLocaleString()}`:''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            disabled={!selectedId || loading}
            onClick={enableNow}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-5 py-2.5 rounded-lg font-semibold"
          >
            <PlayCircle className="w-4 h-4" />
            Habilitar canal
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   PANEL: Asignar dueño a canal (ya existente)
   ========================= */
function AssignChannelOwnerPanel() {
  const [channels, setChannels] = useState([]);
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('id,name,country,owner_user_id')
        .order('name', { ascending: true })
        .limit(200);
      if (!active) return;
      if (error) {
        setMsg(`❌ Error cargando canales: ${error.message}`);
      } else {
        setChannels(data || []);
      }
    })();
    return () => { active = false; };
  }, []);

  const filtered = channels.filter(c =>
    (c.name || '').toLowerCase().includes(filter.toLowerCase()) ||
    (c.country || '').toLowerCase().includes(filter.toLowerCase())
  );

  const assignOwner = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!selectedId) {
      setMsg('❌ Selecciona un canal.');
      return;
    }
    const email = ownerEmail.trim().toLowerCase();
    if (!email) {
      setMsg('❌ Ingresa un correo válido.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.rpc('assign_channel_owner', {
        p_channel_id: selectedId,
        p_owner_email: email,
      });
      if (error) throw error;
      setMsg('✅ Dueño asignado correctamente.');
      setOwnerEmail('');
      setChannels(prev => prev.map(c => c.id === selectedId ? { ...c, owner_user_id: 'updated' } : c));
    } catch (err) {
      setMsg(`❌ ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 bg-gray-800/70 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="w-5 h-5 text-rose-400" />
        <h3 className="text-xl font-semibold">Asignar dueño a canal</h3>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          msg.startsWith('✅') ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-200'
                               : 'bg-red-900/40 border border-red-700 text-red-200'
        }`}>
          {msg}
        </div>
      )}

      <form onSubmit={assignOwner} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <label className="block text-sm text-gray-300 mb-1">Buscar canal</label>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Nombre o país…"
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm text-gray-300 mb-1">Canal</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          >
            <option value="">— Selecciona —</option>
            {filtered.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.country ? `(${c.country})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm text-gray-300 mb-1">Correo del dueño</label>
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          />
        </div>

        <div className="md:col-span-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-5 py-2.5 rounded-lg font-semibold"
          >
            {loading ? 'Asignando…' : 'Asignar dueño'}
          </button>
          <p className="text-xs text-gray-400 mt-2">
            Nota: el correo debe existir en <code>auth.users</code>/<code>user_profiles</code>. Esta acción usa el RPC <code>assign_channel_owner</code>.
          </p>
        </div>
      </form>
    </div>
  );
}

/* =========================
   FORMULARIO ALTA DE CANAL
   ========================= */
function AdminChannelForm() {
  const [form, setForm] = useState({
    ownerEmail: '',
    name: '',
    country: '',
    description: '',
    category: '',
    posterFile: null,
    stream_url: '',
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
    if (type === 'file') setForm((s) => ({ ...s, posterFile: files?.[0] || null }));
    else if (type === 'checkbox') setForm((s) => ({ ...s, [name]: checked }));
    else setForm((s) => ({ ...s, [name]: value }));
  };

  const uploadPoster = async (file) => {
    if (!file) return null;
    const path = `posters/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const up = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '0', upsert: true });
    if (up.error) throw up.error;
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    return pub?.publicUrl || null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setSubmitting(true);
    try {
      let posterUrl = null;
      if (form.posterFile) posterUrl = await uploadPoster(form.posterFile);

      let ownerId = null;
      const emailOwner = form.ownerEmail?.trim().toLowerCase();
      if (emailOwner) {
        const { data: owner, error: ownerErr } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', emailOwner)
          .maybeSingle();
        if (ownerErr) throw ownerErr;
        ownerId = owner?.id || null;
      }

      const payload = {
        name: form.name.trim(),
        country: form.country.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        poster: posterUrl,
        stream_url: form.stream_url.trim(),
        owner_user_id: ownerId,
      };

      if (form.rokuEnabled) {
        payload.roku = ICON_URLS.roku;
        payload.roku_link_url = form.roku_link_url?.trim() || null;
      } else {
        payload.roku = null;
        payload.roku_link_url = null;
      }

      if (form.youtubeEnabled) {
        payload.youtube_icon_url = ICON_URLS.youtube;
        payload.youtube_url = form.youtube_url?.trim() || null;
      } else {
        payload.youtube_icon_url = null;
        payload.youtube_url = null;
      }

      if (form.facebookEnabled) {
        payload.facebook_icon_url = ICON_URLS.facebook;
        payload.facebook_url = form.facebook_url?.trim() || null;
      } else {
        payload.facebook_icon_url = null;
        payload.facebook_url = null;
      }

      if (form.tiktokEnabled) {
        payload.tiktok_icon_url = ICON_URLS.tiktok;
        payload.tiktok_url = form.tiktok_url?.trim() || null;
      } else {
        payload.tiktok_icon_url = null;
        payload.tiktok_url = null;
      }

      if (form.websiteEnabled) {
        payload.website_icon_url = ICON_URLS.website;
        payload.website_url = form.website_url?.trim() || null;
      } else {
        payload.website_icon_url = null;
        payload.website_url = null;
      }

      const { error } = await supabase.from('channels').insert([payload]);
      if (error) throw error;

      setMsg('✅ Canal creado correctamente.');
      setForm((s) => ({
        ...s,
        ownerEmail: '',
        name: '',
        country: '',
        description: '',
        category: '',
        posterFile: null,
        stream_url: '',
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

  const iconNote = (url) => (
    <div className="text-xs text-gray-400 flex items-end">
      Ícono: <span className="ml-2 underline break-all">{url}</span>
    </div>
  );

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
        {/* Propietario (correo) */}
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-300 mb-1">Propietario (correo)</label>
          <input
            name="ownerEmail"
            value={form.ownerEmail}
            onChange={onChange}
            placeholder="correo@ejemplo.com"
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          />
          <p className="text-xs text-gray-400 mt-1">
            Se asignará el canal a este usuario (debe existir en <code>user_profiles</code>).
          </p>
        </div>

        {/* Nombre (AGREGADO) */}
        <div className="md:col-span-2">
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

        {/* Lista M3u8 */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Lista M3u8</label>
          <input
            name="stream_url"
            value={form.stream_url}
            onChange={onChange}
            placeholder="https://tu-cdn.com/stream/playlist.m3u8"
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          />
        </div>

        {/* Poster */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Póster</label>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 bg-gray-700/50 border border-gray-600 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-700">
              <Upload className="w-4 h-4" />
              <span>Subir imagen</span>
              <input type="file" accept="image/*" onChange={onChange} name="posterFile" className="hidden" />
            </label>
            <span className="text-xs text-gray-400 truncate max-w-[240px]">
              {form.posterFile ? form.posterFile.name : 'Sin archivo seleccionado'}
            </span>
          </div>
        </div>

        {/* Descripción */}
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
              {iconNote(ICON_URLS.roku)}
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
                {iconNote(ICON_URLS.youtube)}
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
                {iconNote(ICON_URLS.facebook)}
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
                {iconNote(ICON_URLS.tiktok)}
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
                {iconNote(ICON_URLS.website)}
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
   NUEVO: Panel de estado (Activos/Inactivos) + modales
   ========================= */
function ChannelStatusPanel() {
  const [active, setActive] = useState([]);
  const [inactive, setInactive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(null); // 'active' | 'inactive' | null

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: act, error: errA } = await supabase
          .from('channels')
          .select('*')
          .eq('is_suspended', false)
          .order('name', { ascending: true });
        if (errA) throw errA;

        const { data: ina, error: errI } = await supabase
          .from('channels')
          .select('*')
          .eq('is_suspended', true)
          .order('name', { ascending: true });
        if (errI) throw errI;

        if (!mounted) return;
        setActive(act || []);
        setInactive(ina || []);
      } catch (e) {
        console.error('[ChannelStatusPanel] load error', e);
        if (!mounted) return;
        setActive([]);
        setInactive([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const fmt = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '—';
    return dt.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const list = openModal === 'active' ? active : inactive;

  return (
    <div className="mt-8 bg-gray-800/60 border border-gray-700 rounded-2xl p-4">
      <h4 className="text-lg font-semibold mb-3">Estado de canales</h4>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setOpenModal('active')}
          className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 transition border border-emerald-600"
          disabled={loading}
          title="Ver lista de canales activos"
        >
          Canales activos = <span className="font-bold">{active.length}</span>
        </button>

        <button
          onClick={() => setOpenModal('inactive')}
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 transition border border-gray-600"
          disabled={loading}
          title="Ver lista de canales inactivos"
        >
          Canales inactivos = <span className="font-bold">{inactive.length}</span>
        </button>
      </div>

      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-xl font-semibold">
                {openModal === 'active' ? 'Canales activos' : 'Canales inactivos'}
              </h5>
              <button
                onClick={() => setOpenModal(null)}
                className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600"
              >
                Cerrar
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto rounded-lg border border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/70">
                  <tr>
                    <th className="text-left px-3 py-2 border-b border-gray-700">Canal</th>
                    <th className="text-left px-3 py-2 border-b border-gray-700">Vigencia (next_billing_at)</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.id} className="odd:bg-gray-800/30">
                      <td className="px-3 py-2 border-b border-gray-800">{c.name || '—'}</td>
                      <td className="px-3 py-2 border-b border-gray-800">{fmt(c.next_billing_at)}</td>
                    </tr>
                  ))}
                  {list.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-400" colSpan={2}>
                        Sin registros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}
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

      log('5) OK admin: mostrar formulario en esta misma página.');
    } catch (e2) {
      setErr(e2?.message || String(e2));
      log('✖ ERROR', e2?.message || String(e2));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate('/', { replace: true });
    }
  };

  if (user && profile?.role === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">
        <header className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <img
              src="https://uqzcnlmhmglzflkuzczk.supabase.co/storage/v1/object/public/avatars/logo_hispana_blanco.png"
              alt="Delsu TV"
              className="w-[240px] h-[100px] object-contain"
              loading="eager"
              decoding="async"
            />
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
          >
            Salir
          </button>
        </header>

        {/* PANELES EXISTENTES */}
        <SuspendChannelPanel />
        <SuspendedChannelsPanel />
        <AssignChannelOwnerPanel />
        <AdminChannelForm />

        {/* Estado (activos/inactivos) al final */}
        <ChannelStatusPanel />
      </div>
    );
  }

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
