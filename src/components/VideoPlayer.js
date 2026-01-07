// src/components/VideoPlayer.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";

export default function VideoPlayer({ src = "", title = "Reproductor", poster, hideSource = false }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | loading | playing | error
  const [errorMsg, setErrorMsg] = useState("");

  const isHlsSrc = useMemo(() => typeof src === "string" && src.toLowerCase().includes(".m3u8"), [src]);

  useEffect(() => {
    const video = videoRef.current;
    setStatus("loading");
    setErrorMsg("");

    // Limpieza previa
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (!video) return;

    const onPlaying = () => setStatus("playing");
    const onError = () => {
      setStatus("error");
      setErrorMsg("No se pudo iniciar la reproducción.");
    };

    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onError);

    const startNative = () => {
      try {
        video.src = src;
        video.load();
        video.play().catch(() => setStatus("error"));
      } catch {
        setStatus("error");
      }
    };

    if (isHlsSrc && Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 60,
        enableWorker: true,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data?.fatal) {
          setStatus("error");
          setErrorMsg("Error HLS: " + (data?.details || "fatal"));
          try { hls.destroy(); } catch {}
        }
      });

      try {
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => setStatus("error"));
        });
      } catch {
        setStatus("error");
        setErrorMsg("No se pudo cargar el manifiesto HLS.");
      }
    } else {
      // Safari/Android con soporte nativo
      startNative();
    }

    return () => {
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onError);
      try {
        if (hlsRef.current) hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    };
  }, [src, isHlsSrc]);

  return (
    <div className="bg-black">
      <div className="px-4 py-2 text-white/90 text-sm bg-gray-800 border-b border-gray-700">
        {title}
      </div>

      <div className="relative">
        <video
          ref={videoRef}
          poster={poster}
          controls
          playsInline
          preload="metadata"
          className="w-full aspect-video bg-black"
        />
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">
            Cargando video…
          </div>
        )}
      </div>

      {status === "error" && (
        <div className="text-red-400 text-xs px-4 py-2 border-t border-gray-700">
          {errorMsg || "Error de reproducción."}
        </div>
      )}

      {!hideSource && (
        <div className="text-gray-500 text-[11px] px-4 py-2 border-t border-gray-800 truncate">
          Fuente: {src || "—"}
        </div>
      )}
    </div>
  );
}
