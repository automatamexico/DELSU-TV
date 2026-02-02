import React, { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";

// ✅ Helper: normaliza URL
function normalizeUrl(url) {
  if (!url) return "";
  const u = String(url).trim();
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

// ✅ Helper: decide si conviene proxyear (CORS / mixed content / etc)
function shouldProxy(url) {
  try {
    const u = new URL(url);
    // si es http en sitio https → mixed content → proxy
    if (window?.location?.protocol === "https:" && u.protocol === "http:") return true;
    return false;
  } catch {
    return false;
  }
}

export default function VideoPlayer({ src }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const [usingProxy, setUsingProxy] = useState(false);
  const [nativeError, setNativeError] = useState("");
  const [needUserGesture, setNeedUserGesture] = useState(false);

  const raw = useMemo(() => normalizeUrl(src), [src]);

  // Proxy automático (si detecta mixed content) + fallback cuando HLS falla
  const finalSrc = useMemo(() => {
    if (!raw) return "";
    if (usingProxy) return `/.netlify/functions/hls-http?u=${encodeURIComponent(raw)}`;
    if (shouldProxy(raw)) return `/.netlify/functions/hls-http?u=${encodeURIComponent(raw)}`;
    return raw;
  }, [raw, usingProxy]);

  // 🚫 bloquea menú contextual (copias/descargas)
  const blockContext = (e) => e.preventDefault();

  // Reset al cambiar el canal
  useEffect(() => {
    setNativeError("");
    setNeedUserGesture(false);
    setUsingProxy(false);

    // cleanup hls anterior
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.removeAttribute("src");
      v.load();
    }
  }, [src]); // ✅ FIX: antes decía rawSrc (no existía)

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !finalSrc) return;

    // Autoplay silencioso (para que no lo bloquee el navegador)
    v.muted = true;

    const tryPlay = async () => {
      try {
        await v.play();
        setNeedUserGesture(false);
      } catch {
        // Si el navegador bloquea autoplay, pedimos gesto
        setNeedUserGesture(true);
      }
    };

    // Si es HLS, usar hls.js cuando hace falta
    const canNativeHls = v.canPlayType("application/vnd.apple.mpegurl");
    const isHls = /\.m3u8(\?|$)/i.test(finalSrc);

    if (isHls && Hls.isSupported() && !canNativeHls) {
      const hls = new Hls({
        // ajustes “seguros” para live
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveDurationInfinity: true,
      });

      hlsRef.current = hls;

      hls.loadSource(finalSrc);
      hls.attachMedia(v);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        tryPlay();
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        // Errores comunes por CORS/mixed/403/manifest
        const fatal = data?.fatal;

        if (!fatal) return;

        // Primer fallo con URL directa → intentamos proxy automático
        if (!usingProxy) {
          setUsingProxy(true);
          return;
        }

        // Ya con proxy también falló → mostramos estado amigable
        setNativeError("Canal fuera de línea");
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    // Último recurso: asignar src directo
    v.src = finalSrc;
    v.load();
    tryPlay();
  }, [finalSrc, usingProxy]);

  // Al hacer clic en el overlay, desmutear y reproducir
  const handleUserStart = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      // al tener gesto del usuario podemos desmutear sin bloqueo
      v.muted = false;
      await v.play();
      setNeedUserGesture(false);
    } catch (e) {
      // si aún falla, lo mostramos pero no rompemos
      setNativeError("Canal fuera de línea");
    }
  };

  return (
    <div
      className="relative select-none"
      onContextMenu={blockContext}
    >
      {/* Vídeo: pide autoplay en silencio */}
      <video
        ref={videoRef}
        className={"w-full h-auto bg-black " + (nativeError ? "opacity-0" : "opacity-100")}
        // claves para autoplay en móviles y escritorio
        playsInline
        muted
        autoPlay
        controls
        preload="auto"
        // 🔒 Bloqueos del navegador
        onContextMenu={blockContext}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        // si quieres iniciar siempre silenciado, deja muted en true.
        // el overlay lo desmutea tras clic.
        onPlay={() => setNeedUserGesture(false)}
      />

      {/* Overlay si el autoplay fue bloqueado */}
      {needUserGesture && (
        <button
          onClick={handleUserStart}
          className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm sm:text-base"
        >
          Toca para reproducir
        </button>
      )}

      {/* Estado amigable cuando el canal está caído */}
      {nativeError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-center px-6">
            <img
              src="https://uqzcnlmhmglzflkuzczk.supabase.co/storage/v1/object/public/avatars/logo_hispana_blanco.png"
              alt="Hispana TV"
              className="mx-auto h-12 sm:h-16 mb-4 opacity-90"
              loading="lazy"
            />
            <div className="text-lg sm:text-xl font-semibold">Canal fuera de línea</div>
            <div className="text-xs sm:text-sm text-gray-300 mt-2">
              Intentaremos reconectar automáticamente.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
