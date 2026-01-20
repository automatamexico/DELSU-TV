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

function CountryBars({ channelId }) {
  const [items, setItems] = React.useState([]);

  React.useEffect(() => {
    let alive = true;
    if (!channelId) return;

    // Acepta múltiples formas de respuesta (array u objetos tipo diccionario)
    const parseHTTP = (json) => {
      if (!json) return [];

      // 1) Arrays comunes
      const arr =
        json.byCountry ||
        json.by_country ||
        json.countries ||
        json.data ||
        (Array.isArray(json) ? json : null);

      if (Array.isArray(arr)) {
        return arr.map((r) => ({
          name:
            r.country_name ||
            r.country ||
            r.country_code ||
            r.code ||
            '—',
          count: Number(r.count ?? r.views ?? r.value ?? 0),
        }));
      }

      // 2) Diccionario { "MX": 27, "AR": 2, ... }
      const dict =
        (json.countries && typeof json.countries === 'object' && !Array.isArray(json.countries) && json.countries) ||
        (typeof json.byCountry === 'object' && !Array.isArray(json.byCountry) && json.byCountry) ||
        (typeof json.data === 'object' && !Array.isArray(json.data) && json.data);

      if (dict) {
        const out = [];
        for (const [key, val] of Object.entries(dict)) {
          if (val == null) continue;
          if (typeof val === 'number') {
            out.push({ name: key, count: Number(val) });
          } else if (typeof val === 'object') {
            out.push({
              name: val.country_name || val.country || val.code || key,
              count: Number(val.count ?? val.views ?? val.value ?? 0),
            });
          }
        }
        return out;
      }

      return [];
    };

    const tryHTTP = async () => {
      // Incluye rutas típicas usadas por el mapa
      const paths = [
        '/api/channel-geo',
        '/channel-geo',
        '/api/geo',
        '/geo',
        '/api/geo/countries',
        '/geo/countries',
        '/api/views/by-country',
        '/views/by-country',
      ];
      for (const p of paths) {
        try {
          const res = await fetch(`${p}?channel_id=${encodeURIComponent(channelId)}`, {
            credentials: 'same-origin',
          });
          if (!res.ok) continue;
          const json = await res.json().catch(() => null);
          const data = parseHTTP(json);
          if (Array.isArray(data) && data.some(d => Number(d.count) > 0)) {
            return data;
          }
        } catch {}
      }
      return [];
    };

    const trySupabase = async () => {
      // RPC opcional si existe
      try {
        const { data, error } = await supabase.rpc('channel_views_top_countries', {
          p_channel_id: channelId,
          p_limit: 4,
        });
        if (!error && Array.isArray(data) && data.length) {
          const rows = data.map(r => ({
            name: r.country_name || r.country || r.country_code || '—',
            count: Number(r.count || r.views || 0),
          }));
          if (rows.some(r => r.count > 0)) return rows;
        }
      } catch {}

      // Tablas comunes
      const tables = ['view_logs', 'views', 'play_logs', 'stats_by_country', 'channel_country_views'];
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
              const rows = data.map(r => ({ name: r[c] || '—', count: Number(r.count || 0) }));
              if (rows.some(r => r.count > 0)) return rows;
            }
          } catch {}
        }
      }
      return [];
    };

    (async () => {
      let rows = await tryHTTP();
      if (!rows.length) rows = await trySupabase();

      // Top 4 países (si hay 1 o 2, se muestran igual)
      const top4 = rows
        .filter(r => Number(r.count) >= 0) // permite también conteos pequeños como 1–2
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);

      if (alive) setItems(top4);
    })();

    return () => {
      alive = false;
    };
  }, [channelId]);

  // ---------- Escala Y según tu regla ----------
  const maxCount = items.length ? Math.max(...items.map(i => i.count)) : 0;
  const MAX = bucketMax(maxCount);

  // Dimensiones SVG
  const W = 520, H = 260, PAD_L = 36, PAD_B = 28;
  const innerW = W - PAD_L - 12;
  const innerH = H - PAD_B - 12;

  // Eje X = número de países (máx 4)
  const n = Math.max(1, items.length || 1);
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
        {/* Grid + labels Y */}
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

        {/* Eje X */}
        <line x1={PAD_L} x2={W - 6} y1={12 + innerH} y2={12 + innerH} stroke="#9ca3af" strokeWidth="1" />

        {/* Barras */}
        {items.map((it, idx) => {
          const x = PAD_L + gap * (idx + 1) + barW * idx;
          const baseY = 12 + innerH;
          const topY = y(it.count);
          const h = it.count > 0 ? Math.max(2, baseY - topY) : 0;
          const fill = colorByCount(it.count);
          return (
            <g key={idx}>
              <line x1={x + barW/2} x2={x + barW/2} y1={baseY} y2={baseY + 4} stroke="#9ca3af" strokeWidth="1" />
              <rect x={x} y={baseY - h} width={barW} height={h} rx="6" ry="6" fill={fill} opacity="0.9" />
              <text x={x + barW/2} y={H - 10} textAnchor="middle" fontSize="11" fill="#e5e7eb">
                {it.name}
              </text>
              {it.count > 0 && (
                <text x={x + barW/2} y={baseY - h - 6} textAnchor="middle" fontSize="11" fill="#e5e7eb">
                  {it.count}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {items.length === 0 && (
        <div className="text-xs text-gray-400 px-2 pb-2">Sin datos suficientes aún.</div>
      )}
    </div>
  );
}

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
