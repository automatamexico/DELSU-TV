// src/components/VideoPlayer.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";

/** Convierte URLs de Streamhoster a /hls/<host>/<path> para pasar por el proxy genérico */
function normalizeM3u8(url = "") {
  if (!url) return "";
  try {
    const u = new URL(url, window.location.origin);
    if (u.hostname.includes("streamhoster.com")) {
      // /hls/<host>/<path>
      return `/hls/${u.host}${u.pathname}`;
    }
    return u.toString();
  } catch {
    // Si ya viene relativo (/hls/...), lo dejamos
    if (url.startsWith("/hls/")) return url;
    return url;
  }
}

async function headOk(url, timeoutMs = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { method: "HEAD", signal: ctl.signal });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export default function VideoPlayer({
  src = "",
  title = "Reproductor",
  poster,
  hideSource = true,
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | checking | loading | playing | error
  const [msg, setMsg] = useState("");
  const [finalUrlShown, setFinalUrlShown] = useState("");

  const finalSrc = useMemo(() => {
    const s = normalizeM3u8(src);
    console.debug("[VideoPlayer] original:", src, "→ final:", s);
    setFinalUrlShown(s);
    return s;
  }, [src]);

  const isHls = useMemo(
    () => typeof finalSrc === "string" && finalSrc.toLowerCase().includes(".m3u8"),
    [finalSrc]
  );

  useEffect(() => {
    const video = videoRef.current;
    setStatus("checking");
    setMsg("");

    // Limpieza previa
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch {}
      hlsRef.current = null;
    }
    if (!video) return;

    const onPlaying = () => setStatus("playing");
    const onError = () => {
      setStatus("error");
      setMsg("No se pudo iniciar la reproducción.");
    };

    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onError);

    const startNative = () => {
      setStatus("loading");
      try {
        video.src = finalSrc;
        video.load();
        video.play().catch(() => {
          setStatus("error");
          setMsg("Autoplay bloqueado o error nativo.");
        });
      } catch {
        setStatus("error");
        setMsg("Error nativo al cargar la fuente.");
      }
    };

    (async () => {
      const ok = await headOk(finalSrc, 8000);
      if (!ok) {
        setStatus("error");
        setMsg("No se pudo cargar el manifiesto HLS. Revisa el proxy /hls y que la ruta exista (404/403).");
        console.debug("[VideoPlayer] HEAD falló:", finalSrc);
        return;
      }

      if (isHls && Hls.isSupported()) {
        setStatus("loading");
        const hls = new Hls({
          lowLatencyMode: true,
          enableWorker: true,
          backBufferLength: 60,
          xhrSetup: (xhr) => { xhr.withCredentials = false; },
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.ERROR, (_e, data) => {
          console.debug("[HLS ERROR]", data);
          if (data?.fatal) {
            setStatus("error");
            setMsg("Error HLS: " + (data?.details || "fatal"));
            try { hls.destroy(); } catch {}
          }
        });

        try {
          hls.loadSource(finalSrc);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {
              setStatus("error");
              setMsg("No se pudo iniciar la reproducción (autoplay).");
            });
          });
        } catch {
          setStatus("error");
          setMsg("Error HLS: manifestLoadError (ver URL final más abajo).");
        }
      } else {
        startNative();
      }
    })();

    return () => {
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onError);
      try { if (hlsRef.current) hlsRef.current.destroy(); } catch {}
      hlsRef.current = null;
    };
  }, [finalSrc, isHls]);

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
        {(status === "checking" || status === "loading") && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">
            {status === "checking" ? "Comprobando fuente…" : "Cargando video…"}
          </div>
        )}
      </div>

      {status === "error" && (
        <div className="text-red-400 text-xs px-4 py-2 border-t border-gray-700">
          {msg}
        </div>
      )}

      {/* En errores, muestra la URL final para abrirla en nueva pestaña y verificar 200/403/404 */}
      {status === "error" && finalUrlShown && (
        <div className="text-[11px] text-gray-400 px-4 py-2 border-t border-gray-800 truncate">
          URL final:{" "}
          <a href={finalUrlShown} target="_blank" rel="noreferrer" className="underline">
            {finalUrlShown}
          </a>
        </div>
      )}

      {!hideSource && status !== "error" && finalUrlShown && (
        <div className="text-[11px] text-gray-500 px-4 py-2 border-t border-gray-800 truncate">
          Fuente: {finalUrlShown}
        </div>
      )}
    </div>
  );
}
