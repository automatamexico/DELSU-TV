import React, { useEffect, useMemo, useRef, useState } from "react";
// Si usas hls.js, mantenlo. Si no existe en tu proyecto, deja el import como estaba.
import Hls from "hls.js";

export default function VideoPlayer({ channel, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [needUserGesture, setNeedUserGesture] = useState(false);
  const [nativeError, setNativeError] = useState(null);
  const [usingProxy, setUsingProxy] = useState(false);

  // 🔒 Bloquear menú contextual (clic derecho)
  const blockContext = (e) => e.preventDefault();

  // Resuelve src del canal (ajusta a tus claves reales)
  const src = useMemo(() => {
    return (
      channel?.src ||
      channel?.m3u8 ||
      channel?.hls ||
      channel?.stream_url ||
      ""
    );
  }, [channel]);

  // Proxy (Netlify): /hls-http/<encodeURIComponent(url)>
  const proxiedSrc = useMemo(() => {
    const raw = String(src || "").trim();
    if (!raw) return "";
    // Si ya viene proxyeado, no lo tocamos
    if (raw.startsWith("/hls-http/")) return raw;
    if (raw.startsWith("/.netlify/functions/hls-http")) return raw;
    return `/hls-http/${encodeURIComponent(raw)}`;
  }, [src]);

  const finalSrc = usingProxy ? proxiedSrc : src;

  // Al cambiar de canal, vuelve a empezar sin proxy
  useEffect(() => {
    setUsingProxy(false);
    setNativeError(null);
    setNeedUserGesture(false);
  }, [rawSrc]);

  // Intenta reproducir y detecta bloqueo de autoplay
  const tryPlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      await v.play();
      setNeedUserGesture(false);
    } catch (_e) {
      // Autoplay bloqueado
      setNeedUserGesture(true);
    }
  };

  // Carga fuente HLS o nativa
  useEffect(() => {
    const v = videoRef.current;
    setNeedUserGesture(false);
    setNativeError(null);

    if (!v || !finalSrc) return;

    // Limpia instancias previas
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    v.removeAttribute("src");
    v.load();

    const isNativeHls = v.canPlayType("application/vnd.apple.mpegurl");
    if (isNativeHls) {
      v.src = finalSrc;
      const onCanPlay = () => tryPlay();
      const onError = () => {
        // Si falla directo, intentamos con proxy una vez
        if (!usingProxy) {
          setUsingProxy(true);
          return;
        }
        setNativeError("Canal fuera de línea");
      };

      v.addEventListener("canplay", onCanPlay);
      v.addEventListener("error", onError);
      // Precargar e intentar autoplay
      v.load();
      tryPlay();

      return () => {
        v.removeEventListener("canplay", onCanPlay);
        v.removeEventListener("error", onError);
      };
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        // valores seguros por defecto
        maxBufferLength: 30,
        backBufferLength: 30,
        enableWorker: true,
      });
      hlsRef.current = hls;
      hls.attachMedia(v);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(finalSrc);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        tryPlay();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data?.fatal) return;

        // Si falla directo, reintenta con proxy UNA sola vez
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
