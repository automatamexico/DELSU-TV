// src/components/VideoPlayer.js
// src/components/VideoPlayer.js
import React, { useEffect, useRef, useState } from 'react';

// Convierte la URL original a /hls/... (proxy)
const toProxiedHls = (url) => {
  if (!url || typeof url !== 'string') return '';
  const u = url.replace(/^http:\/\//i, 'https://');
  const HOST = 'https://2-fss-2.streamhoster.com/';
  if (u.startsWith(HOST)) return '/hls/' + u.slice(HOST.length);
  return u;
};

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
 * - channel?: obj  → { stream_url | streamUrl | m3u8 | url }
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

  // Derivar fuente (acepta src o channel.*) y proxear
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
    const video = videoRef.current;
    if (!video) return () => {};

    const fail = (msg) => {
      settled = true;
      setErrorMsg(msg);
      setStatus('error');
      onError?.(new Error(msg));
    };
    const ready = () => {
      settled = true;
      setStatus('ready');
    };

    if (!finalSrc) {
      fail('No hay fuente de video.');
      return () => {};
    }

    // Mixed content
    if (window.location.protocol === 'https:' && finalSrc.startsWith('http://')) {
      fail('Mixed Content: el sitio es HTTPS y el stream es HTTP. Usa HTTPS o /hls/.');
      return () => {};
    }

    // 🔎 PRE-CHEQUEO: pide 1 byte para obtener status real del proxy (403/404/etc.)
    const controller = new AbortController();
    const precheck = fetch(finalSrc, {
      method: 'GET',
      headers: { range: 'bytes=0-1' },
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} al solicitar playlist/segmento`);
      })
      .catch((e) => {
        fail(e?.message || String(e));
      });

    // Timeout de seguridad (10s) por si el HLS no llega a ready
    timeoutId = setTimeout(() => {
      if (!settled) {
        fail('Tiempo de espera agotado al cargar el video. Puede ser CORS/hotlink o el stream está caído.');
      }
    }, 10000);

    const onReadyOnce = () => {
      clearTimeout(timeoutId);
      ready();
      if (autoPlay) video.play().catch(() => {});
    };
    const onVideoError = () => {
      clearTimeout(timeoutId);
      const mediaError = video.error;
      fail(mediaError ? `Error de reproducción (code ${mediaError.code}).` : 'Error de reproducción.');
    };

    const attachNative = () => {
      video.src = finalSrc;
      video.addEventListener('canplay', onReadyOnce, { once: true });
      video.addEventListener('error', onVideoError);
      video.load();
    };

    const setup = async () => {
      try {
        // Espera primero el precheck (si falló, ya hemos mostrado error)
        await precheck;
        if (settled) return;

        // HLS nativo (Safari/iOS)
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          attachNative();
          return;
        }

        await loadHlsScript();
        if (window.Hls && window.Hls.isSupported()) {
          hls = new window.Hls({ enableWorker: true });
          hls.loadSource(finalSrc);
          hls.attachMedia(video);

          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            clearTimeout(timeoutId);
            ready();
            if (autoPlay) video.play().catch(() => {});
          });

          hls.on(window.Hls.Events.ERROR, (_evt, data) => {
            const fatal = data?.fatal;
            const isNetwork = String(data?.type || '').toLowerCase().includes('network');
            if (fatal || isNetwork) {
              clearTimeout(timeoutId);
              fail(`HLS error${fatal ? ' (fatal)' : ''}: ${data?.type || 'desconocido'} ${data?.details || ''}`);
              try { hls.destroy(); } catch {}
            }
          });
        } else {
          attachNative();
        }
      } catch (e) {
        clearTimeout(timeoutId);
        fail(`No se pudo inicializar el reproductor: ${e?.message || e}`);
      }
    };

    setup();

    return () => {
      controller.abort();
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
          <li>Usa la ruta proxied que empiece con <code>/hls/</code> (ya lo hacemos automático).</li>
          <li>Abre DevTools → Network y mira el status del <code>.m3u8</code> y <code>.ts</code>.</li>
          <li>Si ves <strong>403/401</strong>, el origen bloquea por referer/UA/IP: con el proxy ya mandamos referer/UA, pero algunos CDNs bloquean IPs de clouds.</li>
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
