import React, { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";

// Reusa tu redirect/func existente: /hls-http/* -> /.netlify/functions/hls-http?u=:splat
const proxyUrl = (u) => `/hls-http/${encodeURIComponent(u)}`;

function normalizeUrl(url) {
  if (!url) return "";
  const u = String(url).trim();
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

export default function VideoPlayer({
  channel,
  posterUrl = "https://uqzcnlmhmglzflkuzczk.supabase.co/storage/v1/object/public/avatars/poster_hispanatv.png",
  brandLogoUrl = "https://uqzcnlmhmglzflkuzczk.supabase.co/storage/v1/object/public/avatars/logo_hispana_blanco.png",
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const [usingProxy, setUsingProxy] = useState(false);
  const [nativeError, setNativeError] = useState(null);
  const [needUserGesture, setNeedUserGesture] = useState(false);

  // ====== Stream source (del canal) ======
  const src = useMemo(() => {
    const raw =
      channel?.stream_url ||
      channel?.streamUrl ||
      channel?.url ||
      channel?.m3u8 ||
      "";
    return normalizeUrl(raw);
  }, [channel]);

  // Fuente final (directa o proxied)
  const finalSrc = useMemo(() => {
    if (!src) return "";
    return usingProxy ? proxyUrl(src) : src;
  }, [src, usingProxy]);

  // Al cambiar de canal, vuelve a empezar sin proxy
  useEffect(() => {
    setUsingProxy(false);
    setNativeError(null);
    setNeedUserGesture(false);
  }, [src]);

  // ====== Player setup ======
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // Limpieza previa
    try {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    } catch {}

    // Sin fuente: solo muestra poster
    if (!finalSrc) return;

    // Reset estado
    setNativeError(null);
    setNeedUserGesture(false);

    // Helpers
    const safePlay = async () => {
      try {
        await v.play();
        return true;
      } catch (e) {
        // Autoplay policy
        setNeedUserGesture(true);
        return false;
      }
    };

    const attachNative = async () => {
      v.src = finalSrc;
      // autoplay muted suele pasar; el usuario puede subir/bajar volumen y fullscreen desde controles
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";

      const ok = await safePlay();
      return ok;
    };

    const canNativeHls = !!v.canPlayType("application/vnd.apple.mpegurl");

    // iOS/Safari con HLS nativo
    if (canNativeHls) {
      attachNative().catch((e) => {
        setNativeError(e?.message || "Error reproduciendo HLS nativo.");
        // Si falla directo, intenta proxy automático
        if (!usingProxy) setUsingProxy(true);
      });
      return () => {
        try {
          v.pause();
          v.removeAttribute("src");
          v.load();
        } catch {}
      };
    }

    // Chrome/Edge/Firefox: Hls.js
    if (Hls.isSupported()) {
      const hls = new Hls({
        // Ajustes suaves para live
        liveSyncDurationCount: 3,
        maxLiveSyncPlaybackRate: 1.5,
        // tolerancia a red
        fragLoadingTimeOut: 20000,
        manifestLoadingTimeOut: 20000,
        levelLoadingTimeOut: 20000,
      });

      hlsRef.current = hls;

      hls.attachMedia(v);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(finalSrc);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // autoplay muted
        v.muted = true;
        safePlay();
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data) return;

        // Si hay error fatal, intentamos proxy automático una vez
        if (data.fatal) {
          const msg = data?.details || data?.type || "Error HLS";
          setNativeError(`No se pudo reproducir. (${msg})`);

          // Si ya estabas en directo, pasa a proxy
          if (!usingProxy) {
            setUsingProxy(true);
            return;
          }

          // Si ya estabas en proxy y sigue fatal, solo deja el poster (sin “errores feos”)
          try {
            hls.destroy();
          } catch {}
        }
      });

      return () => {
        try {
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
          v.pause();
          v.removeAttribute("src");
          v.load();
        } catch {}
      };
    }

    // Si no hay soporte nativo ni Hls.js
    setNativeError("Tu navegador no soporta HLS.");
    return () => {};
  }, [finalSrc, usingProxy]);

  // ====== UI: Poster/Offline overlay ======
  const showOffline = !!nativeError;

  return (
    <div className="w-full">
      <div className="relative w-full rounded-xl overflow-hidden bg-black">
        {/* Video */}
        <video
          ref={videoRef}
          className={"w-full h-auto bg-black " + (showOffline ? "opacity-0" : "opacity-100")}
          controls
          playsInline
          preload="auto"
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
        />

        {/* Overlay cuando falla */}
        {showOffline && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-center bg-cover"
              style={{ backgroundImage: `url(${posterUrl})`, filter: "brightness(0.35)" }}
            />
            <div className="relative z-10 text-center px-6">
              <img
                src={brandLogoUrl}
                alt="HispanaTV"
                className="mx-auto w-[220px] h-[90px] object-contain opacity-95"
                loading="eager"
                decoding="async"
              />
              <div className="mt-3 text-white font-semibold text-lg">Canal fuera de línea</div>
              <div className="mt-1 text-white/80 text-sm">
                {usingProxy ? "Intentando vía proxy…" : "Intentando conexión directa…"}
              </div>

              {/* Botón para reintentar y/o forzar proxy */}
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setNativeError(null);
                    // reinicia el flujo sin cambiar nada más
                    setUsingProxy(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold"
                >
                  Reintentar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNativeError(null);
                    setUsingProxy(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  Forzar proxy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Overlay para autoplay bloqueado */}
        {!showOffline && needUserGesture && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <button
              type="button"
              onClick={() => {
                const v = videoRef.current;
                if (!v) return;
                v.muted = false; // si ya dio click, ya puedes quitar mute y usar volumen
                v.play().catch(() => {});
                setNeedUserGesture(false);
              }}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Tocar para reproducir
            </button>
          </div>
        )}
      </div>

      {/* Indicador mini */}
      <div className="mt-2 text-xs text-gray-400 flex justify-between">
        <span>{channel?.name || channel?.title || "Canal"}</span>
        <span>{usingProxy ? "Proxy activo" : "Directo"}</span>
      </div>
    </div>
  );
}
