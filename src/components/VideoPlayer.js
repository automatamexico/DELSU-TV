// src/components/VideoPlayer.js
import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { logEvent } from "../utils/analytics";

// ✅ Imagen de fondo (pon aquí tu logo o un fondo bonito)
const OFFLINE_BG =
  "https://uqzcnlmhmglzflkuzczk.supabase.co/storage/v1/object/public/avatars/logo_hispana_blanco.png";

// 🔹 Detecta si la URL ya pasa por proxy o si es externa
function needsProxy(url) {
  if (!url) return false;
  const u = String(url).trim();
  return (
    !u.includes("/hls-http/") &&
    !u.startsWith("/") &&
    !u.includes("netlify.app") &&
    !u.includes("hispanatv.com")
  );
}

// 🔹 Crea la versión proxificada de una URL
function proxify(url) {
  try {
    const encoded = encodeURIComponent(String(url).trim());
    return `/hls-http/${encoded}`;
  } catch {
    return url;
  }
}

export default function VideoPlayer({ channel, onClose }) {
  const videoRef = useRef(null);
  const monetagTriggeredRef = useRef(false);
  const adTriggeredRef = useRef(false);
  const hlsRef = useRef(null);

  const rawUrl = channel?.stream_url || channel?.url || "";
  const [streamUrl, setStreamUrl] = useState(rawUrl);
  const [usingProxy, setUsingProxy] = useState(false);

  // 👇 Estado de "offline poster"
  const [offline, setOffline] = useState(false);
  const [needUserGesture, setNeedUserGesture] = useState(false);

  // Evitar duplicar play por el mismo canal mientras el modal está abierto
  const playLoggedRef = useRef(false);

  const blockContext = (e) => e.preventDefault();

  // Cada vez que cambie el canal, resetea estados
  useEffect(() => {
    setStreamUrl(rawUrl);
    setUsingProxy(false);
    setOffline(false);
    setNeedUserGesture(false);
    playLoggedRef.current = false;
  }, [rawUrl]);

  const destroyHls = () => {
    try {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    } catch {}
  };

  // ✅ No mostramos errores técnicos: solo "offline"
  const goOffline = () => {
    setOffline(true);
    setNeedUserGesture(false);
  };

  // ✅ Fallback automático: directo -> proxy -> offline
  const handleLoadError = () => {
    if (!usingProxy && needsProxy(rawUrl)) {
      // eslint-disable-next-line no-console
      console.log("⚠️ Stream directo falló. Reintentando por proxy…");
      setUsingProxy(true);
      setStreamUrl(proxify(rawUrl));
      setOffline(false);
      return;
    }
    // eslint-disable-next-line no-console
    console.log("⛔ Stream falló incluso con proxy. Mostrando offline.");
    goOffline();
  };

  useEffect(() => {
    const video = videoRef.current;
  // 🔥 MONETAG (NO rompe nada)
if (video && !monetagTriggeredRef.current) {
  const handleMonetagClick = () => {
    if (monetagTriggeredRef.current) return;
    monetagTriggeredRef.current = true;

    window.open("https://omg10.com/4/10759952", "_blank");
  };

  video.addEventListener("click", handleMonetagClick, { once: true });
  video.addEventListener("touchstart", handleMonetagClick, { once: true });
}
    // POPUNDER
    const s1 = document.createElement("script");
    s1.src = "https://pl28953081.profitablecpmratenetwork.com/12/21/1f/12211ff6a4bf0ab3738cb48b0e9d3533.js";
    document.body.appendChild(s1);

    // SOCIAL BAR
    const s2 = document.createElement("script");
    s2.src = "https://pl28953113.profitablecpmratenetwork.com/d7/0d/35/d70d35316bf2e1b69bb0413b32c4df2f.js";
    document.body.appendChild(s2);
  };

  video.addEventListener("click", activarAds, { once: true });
  video.addEventListener("touchstart", activarAds, { once: true });
}
    if (!video || !streamUrl) return undefined;

    setOffline(false);
    setNeedUserGesture(false);

    destroyHls();

    // Limpia handlers previos
    video.onerror = null;
    video.onplaying = null;
    video.oncanplay = null;

    // Autoplay normalmente requiere muted primero
    video.muted = true;

    const tryPlay = async () => {
      try {
        await video.play();
      } catch {
        setNeedUserGesture(true);
      }
    };

    // ✅ Cuando realmente empieza a reproducir: registrar PLAY (con channel_id)
    video.onplaying = () => {
      setOffline(false);
      setNeedUserGesture(false);

      if (playLoggedRef.current) return;

      const cid = channel?.id || channel?.channel_id || channel?.uuid || null;
      if (!cid) return;

      playLoggedRef.current = true;
      logEvent({
        event_type: "play",
        page_path: window.location.pathname,
        channel_id: cid,
      });
    };

    const canNativeHls =
      video.canPlayType("application/vnd.apple.mpegurl") ||
      video.canPlayType("application/x-mpegURL");

    // 🎬 Caso 1: HLS nativo (Safari/iOS)
    if (canNativeHls) {
      video.src = streamUrl;
      video.oncanplay = () => {
        tryPlay();
      };
      video.onerror = () => {
        handleLoadError();
      };

      return () => {
        video.onerror = null;
        video.onplaying = null;
        video.oncanplay = null;
        destroyHls();
      };
    }

    // 🎬 Caso 2: Hls.js
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
          hls.loadSource(streamUrl);
          tryPlay();
        } catch {
          handleLoadError();
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data?.fatal) return;

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          handleLoadError();
          return;
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          try {
            hls.recoverMediaError();
          } catch {
            handleLoadError();
          }
          return;
        }

        handleLoadError();
      });

      return () => {
        destroyHls();
        video.onerror = null;
        video.onplaying = null;
        video.oncanplay = null;
      };
    }

    // Si nada soporta HLS, offline (sin mensaje técnico)
    goOffline();

    return () => {
      destroyHls();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl, channel]);

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
      onContextMenu={blockContext}
    >
      <div className="relative w-full max-w-5xl bg-black rounded-2xl overflow-hidden shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-sm"
        >
          Cerrar
        </button>

        <div className="relative">
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

          {/* ✅ Overlay OFFLINE (no muestra errores técnicos) */}
          {offline && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `url('${OFFLINE_BG}')`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  filter: "blur(1px)",
                }}
              />
              <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
                <img
                  src={OFFLINE_BG}
                  alt="HispanaTV"
                  className="w-40 md:w-56 object-contain mb-6 opacity-90"
                  draggable={false}
                />
                <div className="text-2xl md:text-3xl font-bold text-white">
                  Canal fuera de línea
                </div>
                <div className="mt-2 text-sm md:text-base text-gray-300 max-w-lg">
                  En este momento no hay señal. Intenta más tarde.
                </div>

                <button
                  onClick={() => {
                    setUsingProxy(false);
                    setStreamUrl(rawUrl);
                    setOffline(false);
                    playLoggedRef.current = false;
                  }}
                  className="mt-6 bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-xl border border-white/15"
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}

          {/* Overlay de gesto de usuario (autoplay bloqueado) */}
          {needUserGesture && !offline && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
              <button
                onClick={onUserGesturePlay}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-xl"
              >
                Tocar para reproducir
              </button>
            </div>
          )}
        </div>

        <div className="p-3 text-xs text-gray-300 bg-gray-900/70 flex items-center justify-between">
          <span className="truncate">
            {channel?.name ? `Reproduciendo: ${channel.name}` : "Reproduciendo canal"}
          </span>
          {usingProxy ? (
            <span className="text-amber-400">↪ Modo proxy activado</span>
          ) : (
            <span className="opacity-70">Full + Volumen desde controles del video</span>
          )}
        </div>
      </div>
    </div>
  );
}
