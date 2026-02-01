import React, { useEffect, useRef, useState, useMemo } from "react";
import Hls from "hls.js";

// 🔧 Convierte una URL a su versión proxificada
function proxifyUrl(url) {
  if (!url) return "";
  const encoded = encodeURIComponent(url.trim());
  return `/hls-http/${encoded}`;
}

// 🔧 Determina si la URL es externa (no del dominio actual)
function isExternalUrl(url) {
  try {
    const u = new URL(url, window.location.origin);
    return u.origin !== window.location.origin;
  } catch {
    return false;
  }
}

export default function VideoPlayer({ channel, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);
  const [needUserGesture, setNeedUserGesture] = useState(false);

  // Al montar, decide la URL inicial
  useEffect(() => {
    if (!channel?.stream_url) return;
    setSourceUrl(channel.stream_url.trim());
  }, [channel?.stream_url]);

  const destroyHls = () => {
    try {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    } catch {}
  };

  const initPlayback = async (url, isRetry = false) => {
    const video = videoRef.current;
    if (!video) return;

    destroyHls();
    video.pause();
    video.removeAttribute("src");
    video.load();
    setErrorMsg(null);

    const canNativeHls =
      video.canPlayType("application/vnd.apple.mpegurl") ||
      video.canPlayType("application/x-mpegURL");

    // Función para lanzar reproducción
    const playVideo = async () => {
      try {
        await video.play();
      } catch {
        setNeedUserGesture(true);
      }
    };

    // 🎬 Caso 1: HLS nativo (Safari/iOS)
    if (canNativeHls) {
      video.src = url;
      video.muted = true;
      video.addEventListener("error", async () => {
        if (!isRetry && isExternalUrl(url)) {
          console.warn("Reintentando con proxy...");
          const proxy = proxifyUrl(url);
          setSourceUrl(proxy);
        } else {
          setErrorMsg("Error nativo reproduciendo HLS.");
        }
      });
      playVideo();
      return;
    }

    // 🎬 Caso 2: HLS.js (Chrome, Edge, Firefox, etc.)
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
      });

      hlsRef.current = hls;
      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        try {
          hls.loadSource(url);
        } catch (e) {
          setErrorMsg("Error cargando fuente HLS.");
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data?.fatal) {
          console.warn("HLS fatal:", data);
          if (!isRetry && isExternalUrl(url)) {
            console.warn("Reintentando con proxy...");
            const proxy = proxifyUrl(url);
            setSourceUrl(proxy);
          } else {
            setErrorMsg("Error fatal en reproducción HLS.");
          }
        }
      });

      video.muted = true;
      playVideo();
      return;
    }

    setErrorMsg("Tu navegador no soporta HLS.");
  };

  useEffect(() => {
    if (!sourceUrl) return;
    initPlayback(sourceUrl, false);
    return () => destroyHls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl]);

  const onUserGesturePlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      await v.play();
      setNeedUserGesture(false);
    } catch {
      setNeedUserGesture(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="relative w-full max-w-5xl bg-black rounded-2xl overflow-hidden shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-sm"
        >
          Cerrar
        </button>

        <video
          ref={videoRef}
          className="w-full h-[60vh] md:h-[70vh] object-contain bg-black"
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
        />

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

        {errorMsg && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/70">
            <div className="text-white text-center p-6">
              <div className="text-lg font-semibold mb-2">No se pudo reproducir</div>
              <div className="text-sm opacity-80">{errorMsg}</div>
            </div>
          </div>
        )}

        <div className="p-3 text-xs text-gray-300 bg-gray-900/70 flex items-center justify-between">
          <span className="truncate">
            {channel?.name
              ? `Reproduciendo: ${channel.name}`
              : "Reproduciendo canal"}
          </span>
          <span className="opacity-70">Full + Volumen desde controles del video</span>
        </div>
      </div>
    </div>
  );
}
