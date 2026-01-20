// src/pages/DashboardPage.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ChannelGeoMap from "../components/ChannelGeoMap";
import PageTitle from "../components/PageTitle"; // ← agregado

// 🔹 MiniPlayer: autoplay, loop, proporción 16:9 y botón SOLO para mute
function MiniPlayer({ src }) {
  const videoRef = React.useRef(null);
  const [muted, setMuted] = React.useState(true);

  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    v.play().catch(() => {});
  }, [muted]);

  const blockContext = (e) => e.preventDefault();

  return (
    <div
      className="mt-2 rounded-lg overflow-hidden bg-black relative aspect-video select-none"
      onContextMenu={blockContext}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        src={src}
        autoPlay
        muted={muted}
        loop
        playsInline
        controls={false}
        preload="metadata"
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onContextMenu={blockContext}
      />
      <button
        onClick={() => setMuted((m) => !m)}
        className="absolute bottom-2 right-2 px-2 py-1 text-xs rounded bg-black/60 hover:bg-black/80 border border-white/20"
        aria-label={muted ? 'Quitar mute' : 'Silenciar'}
        title={muted ? 'Quitar mute' : 'Silenciar'}
      >
        {muted ? 'Quitar mute' : 'Silenciar'}
      </button>
    </div>
  );
}

// 🔹 util: formatear fecha “10 Enero 2026”
function formatLongDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// 🔹 util: estrellas (render)
function Stars({ value = 0, max = 5 }) {
  const v = Math.max(0, Math.min(max, Number(value) || 0));
  return (
    <span aria-label={`Calificación: ${v} de ${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i}>{i < v ? '★' : '☆'}</span>
      ))}
    </span>
  );
}

// 🔹 regla de estrellas basada en views_count
function computeStars(views) {
  const v = Number(views) || 0;
  if (v <= 10) return 0;         // 0 a 10 → 0★
  if (v <= 100) return 1;        // 11 a 100 → 1★
  if (v <= 200) return 3;        // 101 a 200 → 3★
  if (v <= 300) return 4;        // 201 a 300 → 4★
  return 5;                      // 301+ → 5★
}

/* =========================
   BARRAS TOP PAÍSES (debajo de tarjetas)
   ========================= */

// --- CountryBars (sin tocar nada más) ---
function CountryBars({ channelId }) {
  // Bucket Y máx (tu regla)
  const bucketMax = (v) => {
    const n = Number(v) || 0;
    if (n <= 0) return 100;
    if (n <= 10) return 10;
    if (n <= 20) return 20;
    if (n <= 50) return 50;
    if (n <= 100) return 100;
    if (n <= 200) return 200;
    if (n <= 300) return 300;
    if (n <= 500) return 500;
    if (n <= 1000) return 1000;
    return 2000;
  };

  // Colores alineados al mapa
  const colorByCount = (count) => {
    const c = Number(count) || 0;
    if (c <= 0) return '#6b7280';
    if (c <= 3) return '#ef4444';   // 1–3
    if (c <= 10) return '#22c55e';  // 4–10
    if (c <= 50) return '#f59e0b';  // 11–50
    return '#ec4899';              // 51+
  };

  const [items, setItems] = React.useState([]);

  React.useEffect(() => {
    let alive = true;
    if (!channelId) return;

    // Normalizador MUY permisivo
    const normalize = (json) => {
      if (!json) return [];
      // Arrays directos
      if (Array.isArray(json)) {
        return json.map((r) => ({
          name: r.country_name || r.country || r.code || r.country_code || '—',
          count: Number(r.count ?? r.views ?? r.value ?? r.total ?? 0),
        }));
      }
      // Campos comunes
      const candidate =
        json.byCountry || json.by_country || json.countries || json.data || json.result || json.stats;
      if (Array.isArray(candidate)) {
        return candidate.map((r) => ({
          name: r.country_name || r.country || r.code || r.country_code || '—',
          count: Number(r.count ?? r.views ?? r.value ?? r.total ?? 0),
        }));
      }
      // Diccionario { MX: 27, AR: 4 }
      const dict =
        (json.countries && typeof json.countries === 'object' && !Array.isArray(json.countries) && json.countries) ||
        (typeof json.byCountry === 'object' && !Array.isArray(json.byCountry) && json.byCountry) ||
        (typeof json.data === 'object' && !Array.isArray(json.data) && json.data) ||
        (typeof json.stats === 'object' && !Array.isArray(json.stats) && json.stats);
      if (dict) {
        return Object.entries(dict).map(([k, v]) => {
          if (typeof v === 'number') return { name: k, count: v };
          if (v && typeof v === 'object') {
            return {
              name: v.country_name || v.country || v.code || k,
              count: Number(v.count ?? v.views ?? v.value ?? v.total ?? 0),
            };
          }
          return { name: k, count: Number(v) || 0 };
        });
      }
      return [];
    };

    // Intentos HTTP: mismas rutas que usan muchos mapas + variantes Netlify
    const baseQs = [
      `channel_id=${encodeURIComponent(channelId)}`,
      `channelId=${encodeURIComponent(channelId)}`,
      `id=${encodeURIComponent(channelId)}`,
      `cid=${encodeURIComponent(channelId)}`
    ];

    const paths = [
      '/api/channel-geo',
      '/api/geo',
      '/api/geo/countries',
      '/api/views/by-country',
      '/channel-geo',
      '/geo',
      '/geo/countries',
      '/views/by-country',
      // Netlify Functions comunes
      '/.netlify/functions/geo',
      '/.netlify/functions/channel-geo',
      '/.netlify/functions/geo-countries',
      '/.netlify/functions/views-by-country',
      '/netlify/functions/geo',
      '/netlify/functions/channel-geo',
    ];

    const tryHTTP = async () => {
      for (const p of paths) {
        for (const q of baseQs) {
          try {
            const url = `${p}?${q}`;
            const res = await fetch(url, { credentials: 'same-origin' });
            if (!res.ok) continue;
            const json = await res.json().catch(() => null);
            const data = normalize(json).filter(x => x && (x.name ?? '') !== '');
            if (data.length) return data;
          } catch { /* siguiente */ }
        }
      }
      return [];
    };

    const trySupabase = async () => {
      // RPC opcional si existe
      try {
        const { data, error } = await supabase.rpc('channel_views_top_countries', {
          p_channel_id: channelId, p_limit: 4,
        });
        if (!error && Array.isArray(data) && data.length) {
          return data.map(r => ({
            name: r.country_name || r.country || r.country_code || '—',
            count: Number(r.count || r.views || 0),
          }));
        }
      } catch {}

      // Fallback genérico a tablas típicas
      const tables = ['stats_by_country', 'channel_country_views', 'view_logs', 'views', 'play_logs'];
      const cols = ['country_name', 'country', 'country_code'];
      for (const t of tables) {
        for (const c of cols) {
          try {
            const { data, error } = await supabase
              .from(t)
              .select(`${c}, count:count()`)
              .eq('channel_id', channelId)
              .not(c, 'is', null)
              .order('count', { ascending: false })
              .limit(4);
            if (!error && Array.isArray(data) && data.length) {
              return data.map(r => ({ name: r[c] || '—', count: Number(r.count || 0) }));
            }
          } catch {}
        }
      }
      return [];
    };

    (async () => {
      // 1) Mismo origen que el mapa (prioridad)
      let rows = await tryHTTP();

      // 2) Supabase (respaldo)
      if (!rows.length) rows = await trySupabase();

      // Top 4 siempre, y si todo viene en cero, deja un “esqueleto” para que se vea
      const top4 = rows
        .map(r => ({ name: String(r.name || '—'), count: Number(r.count) || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);

      if (alive) setItems(top4);
    })();

    return () => { alive = false; };
  }, [channelId]);

  // Escala Y por tu regla
  const maxCount = items.length ? Math.max(...items.map(i => i.count)) : 0;
  const MAX = bucketMax(maxCount);

  // SVG
  const W = 520, H = 260, PAD_L = 36, PAD_B = 28;
  const innerW = W - PAD_L - 12;
  const innerH = H - PAD_B - 12;

  const n = Math.max(1, (items.length || 1));
  const barW = innerW / (n * 1.6);
  const gap  = (innerW - barW * n) / (n + 1);

  const y = (v) => 12 + innerH - (Math.max(0, Math.min(MAX, v)) / MAX) * innerH;

  const step = (() => {
    if (MAX <= 20) return 5;
    if (MAX <= 50) return 10;
    if (MAX <= 100) return 10;
    if (MAX <= 200) return 20;
    if (MAX <= 300) return 30;
    if (MAX <= 500) return 50;
    if (MAX <= 1000) return 100;
    return 200;
  })();

  return (
    <div className="mt-6 bg-gray-800/60 border border-gray-700 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Top países por reproducciones</h3>
        <span className="text-[11px] text-gray-400">Y máx: {MAX}</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[260px]">
        {/* Grid + etiquetas Y */}
        {Array.from({ length: Math.floor(MAX / step) + 1 }).map((_, i) => {
          const val = i * step;
          const yy = y(val);
          return (
            <g key={i}>
              <line x1={PAD_L} x2={W - 6} y1={yy} y2={yy} stroke="#4b5563" strokeWidth="1" opacity="0.4" />
              <text x={PAD_L - 6} y={yy + 3} textAnchor="end" fontSize="10" fill="#9ca3af">{val}</text>
            </g>
          );
        })}
        <line x1={PAD_L} x2={W - 6} y1={12 + innerH} y2={12 + innerH} stroke="#9ca3af" strokeWidth="1" />

        {/* Barras */}
        {items.length > 0 ? items.map((it, idx) => {
          const x = PAD_L + gap * (idx + 1) + barW * idx;
          const baseY = 12 + innerH;
          const topY = y(it.count);
          const h = it.count > 0 ? Math.max(2, baseY - topY) : 0;
          const fill = colorByCount(it.count);
          return (
            <g key={idx}>
              <line x1={x + barW/2} x2={x + barW/2} y1={baseY} y2={baseY + 4} stroke="#9ca3af" strokeWidth="1" />
              <rect x={x} y={baseY - h} width={barW} height={h} rx="6" ry="6" fill={fill} opacity="0.95" />
              <text x={x + barW/2} y={H - 10} textAnchor="middle" fontSize="11" fill="#e5e7eb">
                {it.name}
              </text>
              <text x={x + barW/2} y={baseY - h - 6} textAnchor="middle" fontSize="11" fill="#e5e7eb">
                {it.count}
              </text>
            </g>
          );
        }) : (
          // Si aún no hay datos reales, deja el placeholder mínimo para que NO se vea “vacío”
          <g>
            <text x={W/2} y={H/2} textAnchor="middle" fontSize="12" fill="#9ca3af">
              Sin datos suficientes aún.
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
// --- fin CountryBars ---



export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [channels, setChannels] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState('');

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate('/', { replace: true });
    }
  };

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        setErr('');
        setLoading(true);
        if (!user?.id) return;

        const { data, error } = await supabase
          .from('channels')
          .select(
            'id,name,poster,stream_url,country,category,is_suspended,billing_next_due_date,views_count'
          )
          .eq('owner_user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (alive) setChannels(data || []);
      } catch (e) {
        if (alive) setErr(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <PageTitle title="Hispana TV • Dashboard" /> {/* ← agregado */}

      {/* Top bar */}
      <header className="px-6 py-4 border-b border-gray-800">
        <div className="grid grid-cols-3 items-center">
          <div className="flex items-center">
            <img
              src="https://uqzcnlmhmglzflkuzczk.supabase.co/storage/v1/object/public/avatars/logo_hispana_blanco.png"
              alt="Hispana TV"
              className="w-[240px] h-[100px] object-contain"
              loading="lazy"
            />
          </div>
          <h1 className="text-xl font-semibold text-center">Tablero de Control</h1>
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

      {/* Contenido */}
      <main className="p-6 space-y-4">
        {loading && <div className="opacity-80">Cargando…</div>}
        {err && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {err}
          </div>
        )}

        {!loading && !err && channels.length === 0 && (
          <div className="opacity-80">No tienes canales asignados todavía.</div>
        )}

        {!loading && !err && channels.length > 0 && (
          <div className="grid lg:grid-cols-3 gap-4 items-start content-start">
            {/* Izquierda: tarjetas */}
            <div className="lg:col-span-1">
              <div className="space-y-4">
                {channels.map((c) => (
                  <div key={c.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-sm text-gray-400">
                      {c.country} • {c.category}
                    </div>

                    <div className="mt-2 grid md:grid-cols-2 gap-4 items-start">
                      <div>
                        {c.stream_url ? (
                          <MiniPlayer src={c.stream_url} />
                        ) : (
                          c.poster && (
                            <img
                              src={c.poster}
                              alt={c.name}
                              className="w-full rounded-lg"
                              loading="lazy"
                            />
                          )
                        )}
                      </div>

                      <div className="text-sm space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Estatus del Canal :</span>
                          <span
                            className={
                              (c.is_suspended ? 'bg-red-600/80' : 'bg-green-600/80') +
                              ' text-black font-semibold px-2 py-0.5 rounded'
                            }
                          >
                            {c.is_suspended ? 'Inactivo' : 'Activo'}
                          </span>
                        </div>

                        <div>
                          <span className="font-semibold">Próximo pago:</span>{' '}
                          {formatLongDate(c.billing_next_due_date)}
                        </div>

                        <div>
                          <span className="font-semibold">Número acumulado de Vistas :</span>{' '}
                          {typeof c.views_count === 'number' ? c.views_count : 0}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Calificación del Canal:</span>
                          <Stars value={computeStars(c.views_count)} />
                        </div>

                        <div className="pt-1">
                          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg">
                            Pagar Renovación
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* === Barras top países (usa el primer canal visible) === */}
                <CountryBars channelId={channels[0]?.id} />
              </div>
            </div>

            {/* Derecha: mapa */}
            <div className="lg:col-span-2 self-start">
              <div className="rounded-2xl border border-gray-700 bg-gray-800/20 p-0 overflow-hidden">
                <ChannelGeoMap
                  channelId={channels[0].id}
                  className="h-[500] md:h-[500px] lg:h-[690px]"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
