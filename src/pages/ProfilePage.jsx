// src/pages/ProfilePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile: cachedProfile } = useAuth(); // por si ya lo tienes en contexto
  const [authUser, setAuthUser] = useState(null);
  const [dbProfile, setDbProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Trae el usuario autenticado
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setAuthUser(data?.user ?? null);
    })();
  }, []);

  // Trae el perfil desde user_profiles (id = auth.uid)
  useEffect(() => {
    if (!authUser?.id) return;
    let isMounted = true;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, full_name, country, avatar_url")
        .eq("id", authUser.id)
        .single();

      if (isMounted) {
        if (!error) setDbProfile(data || null);
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [authUser?.id]);

  // Datos mostrados (preferimos DB; caemos a lo que haya en cache)
  const fullName =
    dbProfile?.full_name ||
    cachedProfile?.full_name ||
    "Sin nombre";

  const country =
    dbProfile?.country ||
    cachedProfile?.country ||
    "—";

  const email = authUser?.email || cachedProfile?.email || "—";

  // Iniciales para el “avatar”
  const initials = useMemo(() => {
    const base =
      (fullName && fullName.trim()) ||
      (email && email.split("@")[0]) ||
      "";
    if (!base) return "U";
    const parts = base.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    return (a + b).toUpperCase() || a.toUpperCase() || "U";
  }, [fullName, email]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header con botón Regresar */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Perfil</h1>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-2 text-sm font-medium transition"
          >
            ← Regresar
          </button>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 shadow-xl">
          <div className="p-6 sm:p-8">
            {/* Avatar con iniciales + datos */}
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 grid place-items-center text-2xl font-bold select-none">
                {initials}
              </div>

              <div className="min-w-0">
                <div className="text-lg font-semibold truncate">
                  {fullName}
                </div>
                <div className="text-sm text-gray-300 truncate">
                  {email}
                </div>
                <div className="text-sm text-gray-400">
                  {country}
                </div>
              </div>
            </div>

            {/* Estado de carga (suave) */}
            {loading && (
              <div className="mt-6 text-sm text-gray-400">
                Cargando perfil…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


