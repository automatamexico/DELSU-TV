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
    let timeoutId;
    const video = videoRef.current;
    if (!video || !src) return;

    // Mixed content
    if (window.location.protocol === 'https:' && src.startsWith('http://')) {
      const msg = 'Mixed Content: el sitio es HTTPS pero el stream es HTTP. Usa HTTPS o /hls/.';
      setErrorMsg(msg);
      setStatus('error');
      onError?.(new Error(msg));
      return;
    }

    // Timeout de seguridad (10s)
    timeoutId = setTimeout(() => {
      if (status === 'loading') {
        const msg = 'Tiempo de espera agotado al cargar el video. Puede ser CORS/hotlink o el stream está caído.';
        setErrorMsg(msg);
        setStatus('error');
        onError?.(new Error(msg));
      }
    }, 10000);

    const onReadyOnce = () => {
      clearTimeout(timeoutId);
      setStatus('ready');
    };

    const onVideoError = () => {
      clearTimeout(timeoutId);
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
          attachNative();
          return;
        }

        await loadHlsScript();
        if (window.Hls && window.Hls.isSupported()) {
          hls = new window.Hls({ enableWorker: true });
          hls.loadSource(src);
          hls.attachMedia(video);

          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            clearTimeout(timeoutId);
            setStatus('ready');
            if (autoPlay) video.play().catch(() => {});
          });

          hls.on(window.Hls.Events.ERROR, (_evt, data) => {
            // Log de ayuda (abre DevTools > Console)
            // console.log('[HLS ERROR]', data);

            // Trata como error visible si es fatal o si es NETWORK_ERROR
            const fatal = data?.fatal;
            const networkErr = data?.type === 'networkError' || data?.type === 'networkError'.toUpperCase();

            if (fatal || networkErr) {
              clearTimeout(timeoutId);
              const msg = `HLS error${fatal ? ' (fatal)' : ''}: ${data?.type || 'desconocido'} ${data?.details || ''}`;
              setErrorMsg(msg);
              setStatus('error');
              onError?.(new Error(msg));
              try { hls.destroy(); } catch {}
            }
          });
        } else {
          attachNative();
        }
      } catch (e) {
        clearTimeout(timeoutId);
        const msg = `No se pudo inicializar el reproductor: ${e?.message || e}`;
        setErrorMsg(msg);
        setStatus('error');
        onError?.(new Error(msg));
      }
    };

    setup();

    return () => {
      clearTimeout(timeoutId);
      if (hls) {
        try { hls.destroy(); } catch {}
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
          <li>Comprueba que la URL esté viva. En producción usa la ruta proxied que empieza con <code>/hls/</code>.</li>
          <li>Si el origen exige <em>referer</em>, el proxy ya envía el del sitio.</li>
          <li>Revisa DevTools → Network para ver el status del .m3u8 y .ts (200/403/404).</li>
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
