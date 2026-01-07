import React, { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";

/**
 * Props:
 *  - src: string  (URL .m3u8 tal como viene de tu BD)
 *  - title?: string
 *  - poster?: string
 *  - debug?: boolean
 */
export default function VideoPlayer({ src, title = "Reproductor", poster, debug = false }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | loading | playing | error
  const [logLines, setLogLines] = useState([]);

  const log = (tag, payload) => {
    if (!debug) return;
    const line = `[${new Date().toLocaleTimeString()}] ${tag} ${
      payload ? JSON.stringify(payload) : ""
    }`;
    setLogLines((ls) => [...ls.slice(-200), line]);
  };

  // No tocamos el path. Solo proxificamos si es streamhoster.
  const finalSrc = useMemo(() => {
    try {
      const u = new URL(src);
      if (u.hostname.endsWith("streamhoster.com")) {
        const proxied = `/hls${u.pathname}${u.search || ""}`;
        log("SRC_PROXY", { original: src, final: proxied });
        return proxied;
      }
    } catch (_) {
      // src puede ser relativo; lo dejamos como está
    }
    log("SRC_DIRECT", { final: src });
    return src;
  }, [src]); // <- log no es dependencia intencionalmente

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !finalSrc) return;

    let destroyed = false;
    setStatus("loading");

    // *** IMPORTANTE: no usar nombre que empiece con "use" para evitar la regla de hooks
    const playNative = () => {
      log("NATIVE_START", { src: finalSrc });
      video.src = finalSrc;
      video.load();

      const onCanPlay = () => {
        if (destroyed) return;
        setStatus("playing");
        log("NATIVE_PLAYING");
        video.play().catch((e) => log("NATIVE_PLAY_ERR", { e: String(e) }));
      };
      const onError = () => {
        if (destroyed) return;
        setStatus("error");
        log("NATIVE_ERROR", { code: video.error?.code, msg: video.error?.message });
      };

      video.addEventListener("canplay", onCanPlay);
      video.addEventListener("error", onError);

      return () => {
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("error", onError);
        try {
          video.pause();
        } catch {}
        video.removeAttribute("src");
        video.load();
      };
    };

    const isHls = /\.m3u8(\?|$)/i.test(finalSrc);

    if (Hls.isSupported() && isHls) {
      const hls = new Hls({
        manifestLoadingTimeOut: 20000,
        manifestLoadingMaxRetry: 3,
        manifestLoadingRetryDelay: 800,
        xhrSetup: (xhr) => {
          xhr.setRequestHeader("Cache-Control", "no-cache");
        },
      });
      hlsRef.current = hls;

      log("HLS_START", { src: finalSrc });
      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => log("MEDIA_ATTACHED"));
      hls.on(Hls.Events.MANIFEST_LOADING, () => log("MANIFEST_LOADING"));
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        log("MANIFEST_PARSED");
        setStatus("playing");
        video.play().catch((e) => log("AUTO_PLAY_ERR", { e: String(e) }));
      });
      hls.on(Hls.Events.LEVEL_LOADED, (_, data) =>
        log("LEVEL_LOADED", { t: data?.details?.totalduration })
      );

      hls.on(Hls.Events.ERROR, (_, data) => {
        log("HLS_ERROR", { type: data?.type, details: data?.details, fatal: data?.fatal });
        if (data?.fatal) {
          // Destruye Hls y cae a nativo
          try {
            hls.destroy();
          } catch {}
          hlsRef.current = null;
          const cleanupNative = playNative();
          // devolvemos limpieza nativa desde aquí
          return cleanupNative;
        }
      });

      hls.loadSource(finalSrc);

      return () => {
        destroyed = true;
        try {
          hls.destroy();
        } catch {}
        hlsRef.current = null;
      };
    }

    // Fallback nativo (dispositivos iOS o si HLS.js no se usa)
    const cleanup = playNative();
    return () => {
      destroyed = true;
      cleanup?.();
    };
  }, [finalSrc]); // <- log no es dependencia para no re-ejecutar en cada línea

  return (
    <div className="w-full">
      <div className="mb-2 text-white/90 font-semibold">{title}</div>

      <video
        ref={videoRef}
        poster={poster}
        controls
        playsInline
        className="w-full rounded-xl bg-black"
        preload="auto"
      />

      {debug && (
        <div className="mt-3 text-xs text-gray-300 bg-black/60 border border-white/10 rounded-lg p-3 overflow-auto max-h-60">
          <div className="text-red-300 mb-1">
            {status === "error"
              ? "No se pudo cargar el manifiesto HLS. Revisa el proxy /hls/ y la CSP."
              : status === "loading"
              ? "Cargando video…"
              : null}
          </div>
          <div className="font-mono whitespace-pre-wrap">
            {logLines.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
