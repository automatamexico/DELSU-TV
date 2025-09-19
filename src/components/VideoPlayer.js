// src/components/VideoPlayer.js
import React, { useEffect, useRef, useState } from 'react';

const loadHlsScript = () =>
  new Promise((resolve, reject) => {
    if (window.Hls) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });

export default function VideoPlayer({ src, poster = '', autoPlay = true, controls = true, onError }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let hls;
    const video = videoRef.current;
    if (!video || !src) return;

    // 1) Bloqueo de contenido mixto (https sitio + http stream)
    if (window.location.protocol === 'https:' && src.startsWith('http://')) {
      const msg = 'La URL del stream es HTTP y el sitio es HTTPS (Mixed Content). Usa una URL HTTPS o un proxy.';
      setErrorMsg(msg);
      setStatus('error');
      onError?.(new Error(msg));
      return;
    }

    const attachNative = () => {
      video.src = src;
      video.addEventListener('canplay', onReadyOnce, { once: true });
      video.addEventListener('error', onVideoError);
      video.load();
      if (autoPlay) video.play().catch(() => {});
    };

    const onReadyOnce = () => setStatus('ready');

    const onVideoError = () => {
      const mediaError = video.error;
      const msg = mediaError
        ? `Error de reproducción (code ${mediaError.code}).`
        : 'Error de reproducción.';
      setErrorMsg(msg);
      setStatus('error');
      onError?.(new Error(msg));
    };

    const setup = async () => {
      try {
        // Safari y algunos navegadores soportan HLS nativo
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          attachNative();
          return;
        }

        // Otros navegadores: carga hls.js desde CDN (sin instalar nada)
        await loadHlsScript();
        if (window.Hls && window.Hls.isSupported()) {
          hls = new window.Hls({ enableWorker: true });
          hls.loadSource(src);
          hls.attachMedia(video);
          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            setStatus('ready');
            if (autoPlay) video.play().catch(() => {});
          });
          hls.on(window.Hls.Events.ERROR, (_evt, data) => {
            const fatal = data?.fatal;
            if (fatal) {
              const msg = `HLS error: ${data?.type || 'fatal'}`;
              setErrorMsg(msg);
              setStatus('error');
              onError?.(new Error(msg));
            }
          });
        } else {
          // Fall-back: intenta nativo igualmente
          attachNative();
        }
      } catch (e) {
        const msg = `No se pudo inicializar el reproductor: ${e?.message || e}`;
        setErrorMsg(msg);
        setStatus('error');
        onError?.(new Error(msg));
      }
    };

    setup();

    return () => {
      if (hls) {
        try { hls.destroy(); } catch (_) {}
      }
      if (video) {
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [src, autoPlay, onError]);

  if (status === 'loading') {
    return (
      <div className="w-full aspect-video bg-black/70 text-white flex items-center justify-center rounded-lg">
        Cargando video…
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-full aspect-video bg-black/70 text-red-300 p-4 rounded-lg overflow-auto">
        <div className="font-semibold mb-2">No se pudo reproducir el canal</div>
        <div className="text-sm opacity-90">{errorMsg}</div>
        <ul className="text-sm opacity-80 mt-2 list-disc pl-5">
          <li>Verifica que el stream sea HTTPS (no HTTP) para evitar “Mixed Content”.</li>
          <li>Confirma que la URL .m3u8/.mp4 esté online.</li>
          <li>Si requiere CORS, el servidor del stream debe permitirlo.</li>
        </ul>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      poster={poster}
      controls={controls}
      playsInline
      className="w-full rounded-lg"
    />
  );
}
