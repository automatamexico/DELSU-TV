// src/components/VideoPlayer.js
import React, { useEffect, useRef, useState } from 'react';

/** Reescribe cualquier URL absoluta a /hls/<scheme>/<host>/<path>?<query> */
const rewriteAbsoluteToProxy = (absUrl) => {
  try {
    const u = new URL(absUrl);
    const scheme = u.protocol.replace(':', '').toLowerCase(); // http|https
    return `/hls/${scheme}/${u.hostname}${u.pathname}${u.search}`;
  } catch {
    return absUrl;
  }
};
/** Reescribe si es del host origen conocido; si ya viene absoluta, va al universal */
const rewriteToProxy = (url) => {
  if (!url || typeof url !== 'string') return '';
  const httpsUrl = url.replace(/^http:\/\//i, 'https://');
  if (/^https?:\/\//i.test(httpsUrl)) return rewriteAbsoluteToProxy(httpsUrl);
  return httpsUrl; // relativo: lo resolveremos más tarde con base
};

/** Deriva la URL del canal (src o channel.*) y proxéala */
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

/** Resuelve rutas relativas y las pasa por el proxy universal */
const resolveRelativeViaProxy = (baseProxied, relative) => {
  try {
    if (!relative) return '';
    if (/^https?:\/\//i.test(relative)) return rewriteAbsoluteToProxy(relative);
    // baseProxied es /hls/<scheme>/<host>/<path>. Lo convertimos a absoluta para resolver y luego volvemos a proxificar
    const origin = window.location.origin;
    const absBase = new URL(baseProxied, origin);
    const abs = new URL(relative, absBase);
    return rewriteAbsoluteToProxy(abs.href);
  } catch {
    return relative;
  }
};

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

    // ⏳ Timeout de seguridad (12s)
    timeoutId = setTimeout(() => {
      if (!settled) fail('Tiempo de espera agotado al cargar el video (posible CORS/hotlink).');
    }, 12000);

    // 🔎 PRECHECK: manifest y primer media a través del proxy universal
    const controller = new AbortController();
    const precheck = (async () => {
      const r = await fetch(finalSrc, { cache: 'no-store', signal: controller.signal });
      const st = r.headers.get('x-proxy-status') || r.status;
      if (!r.ok) throw new Error(`Manifest HTTP ${st}`);
      const text = await r.text();
      const lines = text.split(/\r?\n/).filter(Boolean);

      // Busca primera línea no-comentario (puede ser variante .m3u8 o segmento .ts)
      let firstMedia = '';
      for (const line of lines) {
        if (!line.trim().startsWith('#')) { firstMedia = line.trim(); break; }
      }
      if (firstMedia) {
        const probe = resolveRelativeViaProxy(finalSrc, firstMedia);
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
        await precheck; // Si falla, ya mostró error
        if (settled) return;

        await loadHlsScript();

        if (window.Hls && window.Hls.isSupported()) {
          // Loader que reescribe TODAS las URLs (variants, segments, keys) al proxy universal
          const BaseLoader = window.Hls.DefaultConfig.loader;
          class ProxyLoader extends BaseLoader {
            load(context, config, callbacks) {
              try {
                const u = context?.url;
                if (typeof u === 'string' && u) {
                  // Si es relativa, resuélvela contra la última URL
                  if (!/^https?:\/\//i.test(u) && typeof context?.frag?.baseurl === 'string') {
                    const abs = new URL(u, context.frag.baseurl).href;
                    context.url = rewriteAbsoluteToProxy(abs);
                  } else {
                    context.url = rewriteToProxy(u);
                  }
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
          <li>Todas las peticiones del HLS van por <code>/hls/&lt;scheme&gt;/&lt;host&gt;/…</code>.</li>
          <li>Abre DevTools → Network y filtra por <code>hls</code> o <code>m3u8</code> / <code>.ts</code>.</li>
          <li>Revisa el header <code>x-proxy-status</code> (debe ser 200). Si ves 403/401, el origen bloquea por IP de cloud.</li>
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

