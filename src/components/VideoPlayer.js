import React, { useEffect, useRef, useState, useMemo } from "react";
import Hls from "hls.js";

// ✅ Normaliza el stream para evitar que pase por /hls/... (Netlify) y reducir "parones" por proxy.
// Si en la BD viene como "/hls/DOMINIO/ruta.m3u8" o sin protocolo, lo convertimos a URL directa.
function resolveStreamUrl(raw) {
  if (!raw) return "";
  let u = String(raw).trim();

  // Caso: /hls/<host>/<path>  (o URL-encoded)
  if (u.startsWith("/hls/")) {
    u = u.slice(5); // quita "/hls/"
    try {
      u = decodeURIComponent(u);
    } catch {}
    if (/^https?:\/\//i.test(u)) return u;
    // algunos orígenes no van por https (ej. :8081)
    if (/:\\d{2,5}\//.test(u) && !u.startsWith("http")) return `http://${u}`;
    return `https://${u}`;
  }

  // Caso: sin protocolo
  if (!/^https?:\/\//i.test(u)) {
    // si trae puerto, mejor intentar http primero
    if (/:\\d{2,5}(\/|$)/.test(u)) return `http://${u}`;
    return `https://${u}`;
  }

  return u;
}

export default function VideoPlayer({ channel, className = "" }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const sourceUrl = useMemo(() => {
    return resolveStreamUrl(channel?.stream_url) || "";
  }, [channel]);

  const [isMuted, setIsMuted] = useState(true);
  const [error, setError] = useState(null);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);

    // Limpia instancia anterior
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }

    if (!sourceUrl) return;

    // 🔧 Config tolerante a redes variables (menos "parones")
    const hlsConfig = {
      // 🔧 Más tolerancia a variaciones de red y evita parones por buffer corto
      lowLatencyMode: true,
      enableWorker: true,

      // Buffer
      maxBufferLength: 90,
      maxMaxBufferLength: 180,
      backBufferLength: 30,
      maxBufferSize: 60 * 1000 * 1000, // 60MB

      // Live sync (reduce saltos/pausas cuando el live se aleja)
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 10,

      // Retries
      fragLoadingMaxRetry: 6,
      fragLoadingRetryDelay: 1000,
      fragLoadingMaxRetryTimeout: 64000,
      manifestLoadingMaxRetry: 6,
      manifestLoadingRetryDelay: 1000,
      manifestLoadingMaxRetryTimeout: 64000,
      levelLoadingMaxRetry: 6,
      levelLoadingRetryDelay: 1000,
      levelLoadingMaxRetryTimeout: 64000,
    };

    // Safari iOS/macOS a veces maneja HLS nativo
    const canNativeHls = video.canPlayType("application/vnd.apple.mpegurl");

    if (canNativeHls) {
      video.src = sourceUrl;
      video.muted = true;
      setIsMuted(true);

      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls(hlsConfig);
      hlsRef.current = hls;

      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        try {
          hls.loadSource(sourceUrl);
        } catch (e) {
          setError(e?.message || "Error cargando stream.");
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        // Si se puede recuperar, lo intenta; si no, reporta.
        if (data?.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            try {
              hls.startLoad();
            } catch {}
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            try {
              hls.recoverMediaError();
            } catch {}
          } else {
            setError("Error fatal en reproducción (HLS).");
            try {
              hls.destroy();
            } catch {}
            hlsRef.current = null;
          }
        }
      });

      // autoplay (silenciado)
      video.muted = true;
      setIsMuted(true);
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      setError("Tu navegador no soporta HLS.");
    }

    return () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
    };
  }, [sourceUrl]);

  return (
    <div className={`relative w-full ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover rounded-xl"
        autoPlay
        playsInline
        muted
        controls={false}
        preload="metadata"
      />

      {/* Botón mute/unmute */}
      <button
        onClick={toggleMute}
        className="absolute bottom-2 right-2 px-3 py-1 text-xs rounded bg-black/60 hover:bg-black/80 border border-white/20"
        aria-label={isMuted ? "Quitar mute" : "Silenciar"}
        title={isMuted ? "Quitar mute" : "Silenciar"}
        type="button"
      >
        {isMuted ? "Quitar mute" : "Silenciar"}
      </button>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm p-3 rounded-xl">
          {error}
        </div>
      )}
    </div>
  );
}
