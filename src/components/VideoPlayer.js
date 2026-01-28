// src/components/VideoPlayer.js
import React, { useEffect, useMemo, useRef, useState } from "react";
// Si usas hls.js, mantenlo. Si no existe en tu proyecto, deja el import como estaba.
import Hls from "hls.js";

export default function VideoPlayer({ channel, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [needUserGesture, setNeedUserGesture] = useState(false);
  const [nativeError, setNativeError] = useState(null);

  // 🔒 Bloquear menú contextual (clic derecho)
  const blockContext = (e) => e.preventDefault();

  const streamUrl = useMemo(() => {
    return channel?.stream_url || channel?.stream || channel?.url || "";
  }, [channel]);

  // Limpieza
  const destroyHls = () => {
    try {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    } catch {}
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setNeedUserGesture(false);
    setNativeError(null);

    // Reset video source
    destroyHls();
    video.pause();
    video.removeAttribute("src");
    video.load();

    if (!streamUrl) return;

    // Preferencia: HLS nativo (Safari/iOS)
    const canNativeHls =
      video.canPlayType("application/vnd.apple.mpegurl") ||
      video.canPlayType("application/x-mpegURL");

    // Intentar reproducción (puede requerir gesto del usuario)
    const tryPlay = async () => {
      try {
        await video.play();
      } catch (e) {
        // Autoplay bloqueado -> pedir click
        setNeedUserGesture(true);
      }
    };

    if (canNativeHls) {
      video.src = streamUrl;
      video.addEventListener("error", () => {
        setNativeError("Error nativo reproduciendo HLS.");
      });
      tryPlay();
      return () => {
        video.removeEventListener("error", () => {});
      };
    }

    // hls.js para Chrome/Edge/Firefox
    if (Hls.isSupported()) {
      const hls = new Hls({
        // Ajustes recomendados para LIVE
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
      });

      hlsRef.current = hls;

      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(streamUrl);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        // Si hay errores fatales, intentar recuperarse
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
            destroyHls();
          }
        }
      });

      // Intentar play
      tryPlay();

      return () => {
        destroyHls();
      };
    }

    // Si no soporta nada:
    setNativeError("Tu navegador no soporta reproducción HLS.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl]);

  const onUserGesturePlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      await v.play();
      setNeedUserGesture(false);
    } catch {
      // sigue bloqueado
      setNeedUserGesture(true);
    }
  };

  // 👇 UI simple con controles nativos
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onContextMenu={blockContext}
    >
      <div className="relative w-full max-w-5xl bg-black rounded-2xl overflow-hidden shadow-2xl">
        {/* Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-sm"
        >
          Cerrar
        </button>

        {/* Video */}
        <video
          ref={videoRef}
          className="w-full h-[60vh] md:h-[70vh] object-contain bg-black"
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          onContextMenu={blockContext}
        />

        {/* Overlay: click para iniciar si autoplay bloqueado */}
        {needUserGesture && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/60">
            <button
              onClick={onUserGesturePlay}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-xl"
            >
              Tocar para reproducir
            </button>
          </div>
        )}

        {/* Error */}
        {nativeError && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/70">
            <div className="text-white text-center p-6">
              <div className="text-lg font-semibold mb-2">No se pudo reproducir</div>
              <div className="text-sm opacity-80">{nativeError}</div>
            </div>
          </div>
        )}

        {/* Hint */}
        <div className="p-3 text-xs text-gray-300 bg-gray-900/70 flex items-center justify-between">
          <span className="truncate">
            {channel?.name ? `Reproduciendo: ${channel.name}` : "Reproduciendo canal"}
          </span>
          <span className="opacity-70">Full + Volumen desde controles del video</span>
        </div>
      </div>
    </div>
  );
}

/**
 * ✅ Opcional: si quieres mostrar "buffering" podrías escuchar "waiting"/"playing",
 * pero ojo: overlays sin pointer-events bloquean el control del player.
 */
