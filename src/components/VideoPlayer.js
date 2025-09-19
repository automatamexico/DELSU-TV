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

    // Mixed Content: sitio https con stream http (bloqueado por navegador)
    if (window.location.protocol === 'https:' && src.startsWith('http://')) {
      const msg = 'La URL del stream es HTTP y el sitio es HTTPS (Mixed Content). Usa una URL HTTPS o el proxy /hls/.';
      setErrorMsg(msg);
      setStatus('error');
      onError?.(new Error(msg));
      return;
    }

    const onReadyOnce = () => setStatus('ready');
    const onVideoError = () => {
      const mediaError = video.error;
      const msg = mediaError ? `Error de reproducción (code ${mediaError.code}).` : 'Error de reproducción.';
      setErrorMsg(msg);
      setStatus('error');
      onError?.(new Error(msg));
    };

    const attachNative = () => {
      video.src = src;
      video.addEventListener('canplay', onReadyOnce, { once: true });
      video.addEventListener('error', onVideoError);
      video.load();
      if (autoPlay) video.play().catch(() => {});
    };

    const setup = async () => {
      try {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari iOS soporta HLS nativo
          attachNative();
          return;
        }

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
            if (data?.fatal) {
              const msg = `HLS error: ${data?.type || 'fatal'}`;
              setErrorMsg(msg);
              setStatus('error');
              onError?.(new Error(msg));
            }
          });
        } else {
          // Fall-back: intenta nativo
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
        video.removeEventListener('error', onVideoError);
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
          <li>Usa la URL proxied (empiece con <code>/hls/</code>) en producción.</li>
          <li>Verifica que la playlist .m3u8 y segmentos estén online.</li>
          <li>Si el origen exige referer, configúralo en la Edge Function.</li>
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
