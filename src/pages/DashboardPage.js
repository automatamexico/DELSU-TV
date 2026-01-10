// src/pages/DashboardPage.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

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
          .select('id,name,poster,stream_url,country,category')
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((c) => (
              <div key={c.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                <div className="font-semibold">{c.name}</div>
                <div className="text-sm text-gray-400">{c.country} • {c.category}</div>

                {/* 🔁 Reemplazo: player autoplay muted (usa póster solo si no hay stream_url) */}
                {c.stream_url ? (
                  <video
                    className="w-full h-36 rounded-lg mt-2 bg-black"
                    src={c.stream_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls={false}
                    preload="none"
                  />
                ) : (
                  c.poster && (
                    <img
                      src={c.poster}
                      alt={c.name}
                      className="w-full h-36 object-cover rounded-lg mt-2"
                      loading="lazy"
                    />
                  )
                )}

                {c.stream_url && (
                  <div className="mt-2 text-xs break-all text-gray-300">
                    {c.stream_url}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
