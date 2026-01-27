// src/pages/AppsIndex.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AppsIndex() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      // Ajusta aquí el nombre de tu tabla si NO es "channels"
      const { data, error } = await supabase
        .from("channels")
        .select(
          "id, slug, title, name, channel_name, poster_url, poster, thumbnail, description, descripcion, apk_url, apk_public_url, android_apk_url"
        )
        .order("title", { ascending: true });

      if (!alive) return;

      if (error) {
        console.error(error);
        setItems([]);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Apps</h1>
            <p className="mt-2 text-gray-600">
              Selecciona un canal para descargar su APK.
            </p>
          </div>

          <Link
            to="/"
            className="rounded-full px-5 py-2.5 bg-gray-900 text-white font-semibold hover:bg-black transition"
          >
            Volver al Home
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 text-gray-600">Cargando…</div>
        ) : (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((ch) => {
              const title = ch?.title || ch?.name || ch?.channel_name || "Canal";
              const poster =
                ch?.poster_url || ch?.poster || ch?.thumbnail || "/poster-fallback.jpg";
              const hasApk = Boolean(ch?.apk_url || ch?.apk_public_url || ch?.android_apk_url);

              return (
                <Link
                  key={ch?.id}
                  to={`/apps/${ch?.slug}`}
                  className="rounded-xl bg-white shadow hover:shadow-md transition overflow-hidden border border-gray-200"
                >
                  <div className="bg-gray-100 flex items-center justify-center p-2">
                    <img
                      src={poster}
                      alt={title}
                      className="h-24 w-auto object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-gray-900 line-clamp-1">
                      {title}
                    </div>
                    <div className={`mt-1 text-xs ${hasApk ? "text-green-700" : "text-gray-500"}`}>
                      {hasApk ? "APK disponible" : "Sin APK"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
