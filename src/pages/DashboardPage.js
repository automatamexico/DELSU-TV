// src/pages/DashboardPage.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ChannelGeoMap from "../components/ChannelGeoMap";

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

  return (
    <div className="mt-2 rounded-lg overflow-hidden bg-black relative aspect-video">
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

// 🔹 regla de estrellas basada en views_count (según tu especificación)
function computeStars(views) {
  const v = Number(views) || 0;
  if (v <= 10) return 0;         // 0 a 10 → 0★
  if (v <= 100) return 1;        // 11 a 100 → 1★
  if (v <= 200) return 3;        // 101 a 200 → 3★
  if (v <= 300) return 4;        // 201 a 300 → 4★
  return 5;                      // 301+ → 5★
}

export default function DashboardPage() {
  // ⬇️ además de signOut, usamos user para filtrar
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [channels, setChannels] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState('');

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      // Ir al Home
      navigate('/', { replace: true });
    }
  };

  // ⬇️ carga de canales del dueño autenticado
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
    return () => {
      alive = false;
    };
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Top bar */}
      <header className="px-6 py-4 border-b border-gray-800">
        <div className="grid grid-cols-3 items-center">
          {/* Izquierda: logo */}
          <div className="flex items-center">
            <img
              src="https://uqzcnlmhmglzflkuzczk.supabase.co/storage/v1/object/public/avatars/logo_hispana_blanco.png"
              alt="Hispana TV"
              className="w-[240px] h-[100px] object-contain"
              loading="lazy"
            />
          </div>

          {/* Centro: título */}
          <h1 className="text-xl font-semibold text-center">Tablero de Control</h1>

          {/* Derecha: botón salir */}
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
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels.map((c) => (
                <div key={c.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                  {/* Cabecera del canal */}
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-sm text-gray-400">
                    {c.country} • {c.category}
                  </div>

                  {/* Layout: player a la izquierda, info a la derecha */}
                  <div className="mt-2 grid md:grid-cols-2 gap-4 items-start">
                    {/* ▶️ Player */}
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

                    {/* ℹ️ Panel de información */}
                    <div className="text-sm space-y-3">
                      {/* 1) Estatus */}
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

                      {/* 2) Próximo pago */}
                      <div>
                        <span className="font-semibold">Próximo pago:</span>{' '}
                        {formatLongDate(c.billing_next_due_date)}
                      </div>

                      {/* 3) Vistas */}
                      <div>
                        <span className="font-semibold">Número acumulado de Vistas :</span>{' '}
                        {typeof c.views_count === 'number' ? c.views_count : 0}
                      </div>

                      {/* 4) Calificación (estrellas calculadas) */}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Calificación del Canal:</span>
                        <Stars value={computeStars(c.views_count)} />
                      </div>

                      {/* 5) Botón Pagar Renovación */}
                      <div className="pt-1">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg">
                          Pagar Renovación
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* La URL del m3u8 NO se muestra */}
                </div>
              ))}
            </div>

            {/* ⬇️ Mapa de audiencia por país (usa el primer canal del dueño) */}
            <div className="mt-6 max-w-[900px] ml-auto">
              <ChannelGeoMap channelId={channels[0].id} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
