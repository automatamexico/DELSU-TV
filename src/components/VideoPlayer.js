// src/components/VideoPlayer.js
import React, { useEffect, useRef, useState } from 'react';
import { toProxiedHls } from '../utils/streamUrl';

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

/**
 * Props:
 * - src?: string   → URL del stream (m3u8/mp4). Si no viene, usa 'channel'.
 * - channel?: obj  → objeto con { stream_url | streamUrl | m3u8 | url }
 * - poster?: string
 * - autoPlay?: boolean
 * - controls?: boolean
 * - onError?: (err) => void
 */
export default function VideoPlayer({
  src: srcProp,
  channel,
  poster = '',
  autoPlay = true,
  controls = true,
  onError,
}) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');

  // Deriva la fuente real (admite src o channel.*) y pásala por /hls/*
  const rawFromChannel =
    channel?.stream_url ||
    channel?.streamUrl ||
    channel?.m3u8 ||
    channel?.url ||
    '';

  const finalSrc = toProxiedHls(
    typeof srcProp === 'string' && srcProp.length ? srcProp : rawFromChannel
  );

  useEffect(() => {
    let hls;
    let timeoutId;
    let settled = false;

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
    if (!video) return () => {};

    if (!finalSrc) {
      setFail('No hay fuente de video.');
      return () => {};
    }

    // Mixed content: https sitio + http stream
    if (window.location.protocol === 'https:' && finalSrc.startsWith('http://')) {
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
      video.src = finalSrc;
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
          hls.loadSource(finalSrc);
          hls.attachMedia(video);

          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            clearTimeout(timeoutId);
            setReady();
            if (autoPlay) video.play().catch(() => {});
          });

          hls.on(window.Hls.Events.ERROR, (_evt, data) => {
            const fatal = data?.fatal;
            const isNetwork = String(data?.type || '').toLowerCase().includes('network');
            if (fatal || isNetwork) {
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
  }, [finalSrc, autoPlay, onError]);

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
          <li>Usa la ruta proxied que empiece con <code>/hls/</code>.</li>
          <li>Verifica que el <code>.m3u8</code> y los segmentos existan.</li>
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
