// src/components/VideoPlayer.js
import React, { useEffect, useRef, useState } from 'react';

/* Reescribe cualquier URL del host origen a la ruta del proxy /hls/* */
const ORIGIN_HOST = 'https://2-fss-2.streamhoster.com/';
const rewriteToProxy = (url) => {
  if (!url || typeof url !== 'string') return '';
  const httpsUrl = url.replace(/^http:\/\//i, 'https://');
  if (httpsUrl.startsWith(ORIGIN_HOST)) {
    return '/hls/' + httpsUrl.slice(ORIGIN_HOST.length);
  }
  return httpsUrl;
};

/* Convierte la URL del canal (src o channel.*) a la del proxy */
const deriveSrc = ({ srcProp, channel }) => {
  const raw =
    (typeof srcProp === 'string' && srcProp) ||
    channel?.stream_url ||
    channel?.streamUrl ||
    channel?.m3u8 ||
    channel?.url ||
    '';
  return rewriteToProxy(raw);
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

/* Resuelve rutas relativas de un manifest respecto a otra URL */
const resolveRelative = (basePath, relative) => {
  try {
    if (/^https?:\/\//i.test(relative) || relative.startsWith('/hls/')) return relative;
    const base = new URL(basePath, window.location.origin);
    const abs = new URL(relative, base);
    // si el host es el de origen, lo pasamos por proxy
    const out = abs.href;
    return rewriteToProxy(out);
  } catch {
    return relative;
  }
};

/**
 * Props:
 *  - src?: string   (opcional)
 *  - channel?: { stream_url | streamUrl | m3u8 | url } (opcional)
 *  - poster?: string
 *  - autoPlay?: boolean
 *  - controls?: boolean
 *  - muted?: boolean  (true recomendado para autoplay)
 *  - onError?: (err) => void
 */
export default function VideoPlayer({
  src: srcProp,
  channel,
  poster = '',
  autoPlay = true,
  controls = true,
  muted = true,
  onError,
}) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');

  const finalSrc = deriveSrc({ srcProp, channel });

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

    if (window.location.protocol === 'https:' && finalSrc.startsWith('http://')) {
      fail('Mixed Content: el sitio es HTTPS y el stream es HTTP. Usa HTTPS o /hls/.');
      return () => {};
    }

    // ⏳ Timeout de seguridad
    timeoutId = setTimeout(() => {
      if (!settled) fail('Tiempo de espera agotado al cargar el video (posible CORS/hotlink).');
    }, 12000);

    // 🔎 PRECHECK: manifest y primer media vía proxy
    const controller = new AbortController();
    const precheck = (async () => {
      const r = await fetch(finalSrc, { cache: 'no-store', signal: controller.signal });
      const st = r.headers.get('x-proxy-status') || r.status;
      if (!r.ok) throw new Error(`Manifest HTTP ${st}`);
      const text = await r.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      let firstMedia = '';
      for (const line of lines) {
        if (!line.trim().startsWith('#')) { firstMedia = line.trim(); break; }
      }
      if (firstMedia) {
        const probe = resolveRelative(finalSrc, firstMedia);
        const r2 = await fetch(probe, {
          method: 'GET',
          headers: { range: 'bytes=0-1' },
          cache: 'no-store',
          signal: controller.signal,
        });
        const st2 = r2.headers.get('x-proxy-status') || r2.status;
        if (!r2.ok) throw new Error(`Media HTTP ${st2}`);
      }
    })();

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
        await precheck;                 // si falla, ya mostrará error
        if (settled) return;

        await loadHlsScript();

        // 🔁 Loader personalizado: reescribe TODAS las URLs a /hls/*
        if (window.Hls && window.Hls.isSupported()) {
          const BaseLoader = window.Hls.DefaultConfig.loader;
          class ProxyLoader extends BaseLoader {
            load(context, config, callbacks) {
              try {
                if (typeof context.url === 'string') {
                  context.url = rewriteToProxy(context.url);
                }
              } catch {}
              super.load(context, config, callbacks);
            }
          }

          hls = new window.Hls({
            enableWorker: true,
            loader: ProxyLoader,
          });

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
          // HLS nativo (Safari/iOS)
          attachNative();
        }
      } catch (e) {
        clearTimeout(timeoutId);
        fail(e?.message || String(e));
      }
    };

    setup();

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
      if (hls) { try { hls.destroy(); } catch {} }
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
          <li>Usamos un proxy y un loader que reescribe todas las peticiones a <code>/hls/</code>.</li>
          <li>Si aparece HTTP 403/401 en Network, el origen está bloqueando por IP de cloud.</li>
        </ul>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      poster={poster}
      controls={controls}
      muted={muted}
      playsInline
      className="w-full rounded-lg"
    />
  );
}

