import React, { useEffect, useMemo, useRef, useState } from "react";
// Si usas hls.js, mantenlo. Si no existe en tu proyecto, deja el import como estaba.
import Hls from "hls.js";

export default function VideoPlayer({ channel, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [needUserGesture, setNeedUserGesture] = useState(false);
  const [nativeError, setNativeError] = useState(null);

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

    if (!v || !src) return;

    // Limpia instancias previas
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    v.removeAttribute("src");
    v.load();

    const isNativeHls = v.canPlayType("application/vnd.apple.mpegurl");
    if (isNativeHls) {
      v.src = src;
      const onCanPlay = () => tryPlay();
      const onError = () =>
        setNativeError("No se pudo cargar el manifiesto/segmentos (nativo).");

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
        hls.loadSource(src);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        tryPlay();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data?.fatal) {
          setNativeError("Error HLS fatal: " + (data?.type || "desconocido"));
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    // Último recurso: asignar src directo
    v.src = src;
    v.load();
    tryPlay();
  }, [src]);

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
      setNativeError("No se pudo iniciar la reproducción.");
    }
  };

  return (
    <div className="relative">
      {/* Vídeo: pide autoplay en silencio */}
      <video
        ref={videoRef}
        className="w-full h-auto bg-black"
        // claves para autoplay en móviles y escritorio
        playsInline
        muted
        autoPlay
        controls
        preload="auto"
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

      {/* Línea de estado suave (no altera el reproductor) */}
      {nativeError && (
        <div className="px-3 py-2 text-xs text-rose-300 bg-rose-900/30">
          {nativeError}
        </div>
      )}
    </div>
  );
}
