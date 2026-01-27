// src/pages/ChannelAppPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";

// Ajusta este import si tu supabase client está en otro path:
import { supabase } from "../lib/supabaseClient";

function norm(v) {
  return String(v || "").trim();
}

function normalizeUrl(url) {
  if (!url) return "";
  const u = String(url).trim();
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

export default function ChannelAppPage() {
  const { slug } = useParams();
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);

  // URL estable de ESTA página (para QR)
  const pageUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/apps/${slug}`;
  }, [slug]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      // OJO: ajusta nombre de tabla/campo según tu DB
      // Aquí asumo que tienes `channels` y un campo `slug`
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        console.error(error);
        setChannel(null);
      } else {
        setChannel(data || null);
      }
      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, [slug]);

  const title =
    channel?.title ||
    channel?.name ||
    channel?.channel_name ||
    "Canal";

  const description =
    channel?.description || channel?.descripcion || channel?.about || "";

  const poster =
    channel?.poster_url ||
    channel?.poster ||
    channel?.thumbnail ||
    "/poster-fallback.jpg";

  // ✅ Link de descarga (estable)
  // RECOMENDADO: guardar en DB un campo como `apk_url` o `apk_public_url`
  // Alternativa: construirlo desde un bucket/path fijo.
  const apkUrl = normalizeUrl(
    channel?.apk_url ||
    channel?.apk_public_url ||
    channel?.android_apk_url ||
    ""
  );

  // Logo de HispanaTV (ajústalo a tu ruta real)
  const hispanaLogo = "/hispanatv-logo.png";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-gray-600">Cargando app del canal…</div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-2xl font-bold text-gray-900">Canal no encontrado</div>
        <p className="mt-2 text-gray-600">
          Ese slug no existe (o se fue por unas palomitas y no regresó).
        </p>
        <Link
          to="/apps"
          className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-2.5 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
        >
          Ver todas las apps
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Contenido centrado tipo landing */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex flex-col items-center text-center">
          {/* Poster / imagen superior */}
          <div className="w-full flex justify-center">
            <div className="rounded-2xl overflow-hidden shadow-md bg-white">
              <img
                src={poster}
                alt={title}
                className="h-28 sm:h-32 w-auto object-contain p-3"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>

          {/* Título */}
          <h1 className="mt-8 text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            {title}
          </h1>

          {/* Descripción */}
          {description ? (
            <p className="mt-4 text-gray-600 text-base sm:text-lg max-w-xl">
              {description}
            </p>
          ) : (
            <p className="mt-4 text-gray-500 text-base sm:text-lg max-w-xl">
              App oficial del canal.
            </p>
          )}

          {/* Botón descarga */}
          <div className="mt-8">
            {apkUrl ? (
              <a
                href={apkUrl}
                className="inline-flex items-center justify-center rounded-full px-8 py-3 bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition shadow"
                download
              >
                ⬇️ Descargar App
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center rounded-full px-8 py-3 bg-gray-300 text-gray-600 font-bold text-lg cursor-not-allowed"
              >
                Descargar App
              </button>
            )}

            <div className="mt-2 text-sm text-gray-500">
              (Android APK)
            </div>

            {!apkUrl && (
              <div className="mt-3 text-sm text-red-600">
                Este canal aún no tiene APK cargado.
              </div>
            )}
          </div>

          {/* QR */}
          <div className="mt-10 text-gray-700">
            <div className="text-base font-semibold">O escanea el código QR:</div>

            <div className="mt-4 inline-flex items-center justify-center bg-white p-5 rounded-2xl shadow">
              {/* QR fijo: apunta a esta página */}
              <QRCodeCanvas value={pageUrl} size={180} includeMargin />
            </div>

            <div className="mt-3 text-xs text-gray-500 break-all">
              {pageUrl}
            </div>
          </div>

          {/* Footer: Desarrollado por */}
          <div className="mt-12 flex flex-col items-center">
            <img
              src={hispanaLogo}
              alt="HispanaTV"
              className="h-10 w-auto object-contain"
              loading="lazy"
              decoding="async"
            />
            <div className="mt-2 text-sm text-gray-600">
              Desarrollado por
            </div>
          </div>

          {/* Link opcional a lista */}
          <Link
            to="/apps"
            className="mt-8 text-sm text-blue-700 hover:underline"
          >
            Ver todas las apps disponibles
          </Link>
        </div>
      </div>
    </div>
  );
}
