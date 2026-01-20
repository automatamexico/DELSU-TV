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

// Colores equivalentes a la leyenda del mapa (buckets aproximados)
function colorByCount(n) {
  if (n >= 51) return '#e879f9';   // 51+  (fucsia/rose)
  if (n >= 11) return '#eab308';   // 11–50 (amarillo)
  if (n >= 4)  return '#22c55e';   // 4–10  (verde)
  if (n >= 1)  return '#ef4444';   // 1–3   (rojo)
  return '#6b7280';                // 0     (gris)
}

function CountryBars({ channelId }) {
  const [items, setItems] = React.useState([]);

  React.useEffect(() => {
    let alive = true;
    if (!channelId) return;

    (async () => {
      try {
        // Reutiliza el mismo endpoint que usa el mapa
        const res = await fetch(`/log-view?channel_id=${channelId}`);
        const json = await res.json().catch(() => ({}));

        const arr =
          json?.byCountry ||
          json?.by_country ||
          json?.countries ||
          [];

        const norm = arr.map((r) => ({
          name: r.country_name || r.country || r.code || '—',
          count: Number(r.count || r.views || r.value || 0)
        }));

        const top = norm
          .filter(x => x.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);

        if (alive) setItems(top);
      } catch (_) {
        if (alive) setItems([]);
      }
    })();

    return () => { alive = false; };
  }, [channelId]);

  // ====== AUTOESCALA ======
  const rawMax = items.length ? Math.max(...items.map(i => i.count)) : 0;
  // si no hay datos o todos 0, forzamos 0–100 para que siempre se pinte
  let MAX;
  if (rawMax <= 0) {
    MAX = 100;
  } else if (rawMax <= 100) {
    MAX = 100;
  } else if (rawMax <= 200) {
    MAX = 200;
  } else if (rawMax <= 500) {
    MAX = 500;
  } else {
    MAX = 1000;
  }
  // ========================

  // Dimensiones del gráfico
  const W = 520;
  const H = 260;
  const PAD_L = 36;
  const PAD_B = 28;
  const STEP_MINOR = 10;          // línea cada 10
  const STEP_MAJOR = 100;         // etiqueta cada 100

  const innerW = W - PAD_L - 12;
  const innerH = H - PAD_B - 12;

  const barW = items.length ? innerW / (items.length * 1.6) : 40;
  const gap = items.length ? (innerW - barW * items.length) / (items.length + 1) : 20;

  const y = (v) => {
    const clamped = Math.max(0, Math.min(MAX, v));
    return 12 + innerH - (clamped / MAX) * innerH;
  };

  return (
    <div className="mt-6 bg-gray-800/60 border border-gray-700 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Top países por reproducciones</h3>
        <span className="text-[11px] text-gray-400">Escala 0–{MAX} (paso 10)</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[260px]">
        {/* Líneas menores cada 10 */}
        {Array.from({ length: Math.floor(MAX / STEP_MINOR) + 1 }).map((_, i) => {
          const val = i * STEP_MINOR;
          const yy = y(val);
          return (
            <line
              key={`m-${i}`}
              x1={PAD_L}
              x2={W - 6}
              y1={yy}
              y2={yy}
              stroke="#374151"
              strokeWidth={val % STEP_MAJOR === 0 ? 0 : 0.6}
              opacity={0.25}
            />
          );
        })}

        {/* Líneas mayores y etiquetas cada 100 */}
        {Array.from({ length: Math.floor(MAX / STEP_MAJOR) + 1 }).map((_, i) => {
          const val = i * STEP_MAJOR;
          const yy = y(val);
          return (
            <g key={`M-${i}`}>
              <line
                x1={PAD_L}
                x2={W - 6}
                y1={yy}
                y2={yy}
                stroke="#4b5563"
                strokeWidth={1}
                opacity={0.5}
              />
              <text
                x={PAD_L - 6}
                y={yy + 3}
                textAnchor="end"
                fontSize="10"
                fill="#9ca3af"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Barras */}
        {items.map((it, idx) => {
          const x = PAD_L + gap * (idx + 1) + barW * idx;
          const h = innerH - (y(it.count) - 12);
          const barY = y(it.count);
          const fill = colorByCount(it.count);
          return (
            <g key={idx}>
              <rect
                x={x}
                y={barY}
                width={barW}
                height={h}
                rx="6"
                ry="6"
                fill={fill}
                opacity="0.9"
              />
              {/* Etiqueta del país */}
              <text
                x={x + barW / 2}
                y={H - 10}
                textAnchor="middle"
                fontSize="11"
                fill="#e5e7eb"
              >
                {it.name}
              </text>
              {/* Valor arriba de la barra */}
              <text
                x={x + barW / 2}
                y={barY - 6}
                textAnchor="middle"
                fontSize="11"
                fill="#e5e7eb"
              >
                {it.count}
              </text>
            </g>
          );
        })}

        {/* Eje Y */}
        <line x1={PAD_L} y1={12} x2={PAD_L} y2={H - PAD_B} stroke="#9ca3af" strokeWidth="1" />
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

                {/* === NUEVO: barras top países (usa el primer canal visible) === */}
                <CountryBars channelId={channels[0]?.id} />
              </div>
            </div>

            {/* Derecha: mapa alineado arriba y sin espacio sobrante */}
            <div className="lg:col-span-2 self-start">
              {/* Contenedor para recortar cualquier sobrante y evitar scroll extra */}
              <div className="rounded-2xl border border-gray-700 bg-gray-800/20 p-0 overflow-hidden">
                {/* Altura ajustada para que la leyenda quede visible sin empujar el layout */}
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
