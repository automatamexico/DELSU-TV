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
    let settled = false; // ← en vez de leer 'status' dentro del efecto

    const setReady = () => {
      settled = true;
      setStatus('ready');
    };

    const setFail = (msg) => {
      settled = true;
      setErrorMsg(msg);
      setStatus('error');
      onError?.(new Error(msg));
    };

    const video = videoRef.current;
    if (!video || !src) {
      setFail('No hay fuente de video.');
      return () => {};
    }

    // Mixed content
    if (window.location.protocol === 'https:' && src.startsWith('http://')) {
      setFail('Mixed Content: el sitio es HTTPS pero el stream es HTTP. Usa HTTPS o el proxy /hls/.');
      return () => {};
    }

    // Timeout de seguridad (10s)
    timeoutId = setTimeout(() => {
      if (!settled) {
        setFail('Tiempo de espera agotado al cargar el video. Puede ser CORS/hotlink o el stream está caído.');
      }
    }, 10000);

    const onReadyOnce = () => {
      clearTimeout(timeoutId);
      setReady();
      if (autoPlay) video.play().catch(() => {});
    };

    const onVideoError = () => {
      clearTimeout(timeoutId);
      const mediaError = video.error;
      const msg = mediaError ? `Error de reproducción (code ${mediaError.code}).` : 'Error de reproducción.';
      setFail(msg);
    };

    const attachNative = () => {
      video.src = src;
      video.addEventListener('canplay', onReadyOnce, { once: true });
      video.addEventListener('error', onVideoError);
      video.load();
    };

    const setup = async () => {
      try {
        // HLS nativo (Safari/iOS)
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          attachNative();
          return;
        }

        // hls.js para otros navegadores
        await loadHlsScript();
        if (window.Hls && window.Hls.isSupported()) {
          hls = new window.Hls({ enableWorker: true });
          hls.loadSource(src);
          hls.attachMedia(video);

          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            clearTimeout(timeoutId);
            setReady();
            if (autoPlay) video.play().catch(() => {});
          });

          hls.on(window.Hls.Events.ERROR, (_evt, data) => {
            const fatal = data?.fatal;
            const networkErr = String(data?.type || '').toLowerCase().includes('network');
            if (fatal || networkErr) {
              clearTimeout(timeoutId);
              const msg = `HLS error${fatal ? ' (fatal)' : ''}: ${data?.type || 'desconocido'} ${data?.details || ''}`;
              setFail(msg);
              try { hls.destroy(); } catch {}
            }
          });
        } else {
          attachNative();
        }
      } catch (e) {
        clearTimeout(timeoutId);
        setFail(`No se pudo inicializar el reproductor: ${e?.message || e}`);
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
  }, [src, autoPlay, onError]); // ✅ sin 'status' en deps

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
          <li>Verifica que el .m3u8 y los segmentos existan y no estén bloqueados.</li>
          <li>Si el origen exige <em>referer</em>, el proxy ya envía el del sitio.</li>
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
