// src/components/VideoPlayer.js
import React, { useEffect, useRef, useState } from 'react';

/** === Helpers de URL/proxy (universal) ================================ **/
const rewriteAbsoluteToProxy = (absUrl) => {
  try {
    const u = new URL(absUrl);
    const scheme = u.protocol.replace(':', '').toLowerCase(); // http|https
    return `/hls/${scheme}/${u.hostname}${u.pathname}${u.search}`;
  } catch {
    return absUrl;
  }
};
const rewriteToProxy = (url) => {
  if (!url || typeof url !== 'string') return '';
  const httpsUrl = url.replace(/^http:\/\//i, 'https://');
  if (/^https?:\/\//i.test(httpsUrl)) return rewriteAbsoluteToProxy(httpsUrl);
  return httpsUrl;
};
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
const resolveRelativeViaProxy = (baseProxied, relative) => {
  try {
    if (!relative) return '';
    if (/^https?:\/\//i.test(relative)) return rewriteAbsoluteToProxy(relative);
    const absBase = new URL(baseProxied, window.location.origin);
    const abs = new URL(relative, absBase);
    return rewriteAbsoluteToProxy(abs.href);
  } catch {
    return relative;
  }
};
/** ===================================================================== **/

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

export default function VideoPlayer({
  src: srcProp,
  channel,
  poster = '',
  autoPlay = true,
  controls = true,
  muted = true,
  onError,
  debug = true, // 👈 debug activado por defecto
}) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');
  const [debugLines, setDebugLines] = useState([]);

  const finalSrc = deriveSrc({ srcProp, channel });
  const push = (msg) =>
    setDebugLines((d) => [...d, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-60));

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
      push(`❌ ${msg}`);
      onError?.(new Error(msg));
    };
    const ready = () => {
      settled = true;
      setStatus('ready');
      push('✅ READY');
    };

    push(`finalSrc = ${finalSrc || '(vacío)'}`);

    if (!finalSrc) {
      fail('No hay fuente de video.');
      return () => {};
    }
    if (window.location.protocol === 'https:' && finalSrc.startsWith('http://')) {
      fail('Mixed Content: el sitio es HTTPS y el stream es HTTP. Usa HTTPS o /hls/.');
      return () => {};
    }

    // Timeout de seguridad (12s)
    timeoutId = setTimeout(() => {
      if (!settled) fail('Tiempo de espera agotado al cargar el video (posible CORS/hotlink).');
    }, 12000);

    // PRECHECK: manifest + primer media
    const controller = new AbortController();
    const precheck = (async () => {
      push(`↓ Manifest: ${finalSrc}`);
      const r = await fetch(finalSrc, { cache: 'no-store', signal: controller.signal });
      const st = r.headers.get('x-proxy-status') || r.status;
      push(`↑ Manifest status: ${st}`);
      if (!r.ok) throw new Error(`Manifest HTTP ${st}`);
      const text = await r.text();
      const lines = text.split(/\r?\n/).filter(Boolean);

      let firstMedia = '';
      for (const line of lines) {
        if (!line.trim().startsWith('#')) { firstMedia = line.trim(); break; }
      }
      if (firstMedia) {
        const probe = resolveRelativeViaProxy(finalSrc, firstMedia);
        push(`↓ First media: ${probe}`);
        const r2 = await fetch(probe, {
          method: 'GET',
          headers: { range: 'bytes=0-1' },
          cache: 'no-store',
          signal: controller.signal,
        });
        const st2 = r2.headers.get('x-proxy-status') || r2.status;
        push(`↑ First media status: ${st2}`);
        if (!r2.ok) throw new Error(`Media HTTP ${st2}`);
      } else {
        push('Manifest sin media directa (variant playlist).');
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
        await precheck; // si falla, ya se llamó fail()
        if (settled) return;

        await loadHlsScript();

        if (window.Hls && window.Hls.isSupported()) {
          const BaseLoader = window.Hls.DefaultConfig.loader;
          class ProxyLoader extends BaseLoader {
            load(context, config, callbacks) {
              try {
                let u = context?.url;
                if (typeof u === 'string' && u) {
                  // Absolutas → /hls/<scheme>/<host>/...
                  if (/^https?:\/\//i.test(u)) {
                    context.url = rewriteAbsoluteToProxy(u);
                  } else if (typeof context?.frag?.baseurl === 'string') {
                    // Relativas → resuélvelas contra baseurl
                    const abs = new URL(u, context.frag.baseurl).href;
                    context.url = rewriteAbsoluteToProxy(abs);
                  }
                  push(`HLS load → ${context.url}`);
                }
              } catch (e) {
                push(`HLS rewrite error: ${e?.message || e}`);
              }
              super.load(context, config, callbacks);
            }
          }

          const _hls = new window.Hls({ enableWorker: true, loader: ProxyLoader });
          hls = _hls;

          _hls.on(window.Hls.Events.ERROR, (_evt, data) => {
            push(`HLS ERROR: ${data?.type || 'unknown'} ${data?.details || ''} fatal=${String(data?.fatal)}`);
            const fatal = data?.fatal;
            const isNetwork = String(data?.type || '').toLowerCase().includes('network');
            if (fatal || isNetwork) {
              clearTimeout(timeoutId);
              fail(`HLS error${fatal ? ' (fatal)' : ''}: ${data?.type || 'desconocido'} ${data?.details || ''}`);
              try { _hls.destroy(); } catch {}
            }
          });

          _hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            clearTimeout(timeoutId);
            push('MANIFEST_PARSED');
            ready();
            if (autoPlay) video.play().catch(() => {});
          });

          _hls.loadSource(finalSrc);
          _hls.attachMedia(video);
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

  // UI
  const DebugBox = () =>
    debug ? (
      <div className="mt-2 text-xs leading-4 text-gray-200 bg-black/40 p-2 rounded max-h-40 overflow-auto">
        <div className="font-semibold mb-1">DEBUG</div>
        <pre className="whitespace-pre-wrap break-all">{debugLines.join('\n')}</pre>
      </div>
    ) : null;

  if (status === 'loading') {
    return (
      <div className="w-full aspect-video bg-black/70 text-white flex flex-col items-center justify-center rounded-lg p-3">
        <div>Cargando video…</div>
        <DebugBox />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-full aspect-video bg-black/70 text-red-300 p-3 rounded-lg overflow-auto">
        <div className="font-semibold mb-1">No se pudo reproducir el canal</div>
        <div className="text-sm opacity-90 mb-2">{errorMsg}</div>
        <ul className="text-sm opacity-80 list-disc pl-5">
          <li>La URL se reescribe a <code>/hls/&lt;scheme&gt;/&lt;host&gt;/…</code>.</li>
          <li>En Network revisa <code>x-proxy-status</code> del <code>.m3u8</code> y los <code>.ts</code>.</li>
        </ul>
        <DebugBox />
      </div>
    );
  }

  return (
    <div>
      <video
        ref={videoRef}
        poster={poster}
        controls={controls}
        muted={muted}
        playsInline
        className="w-full rounded-lg"
      />
      <DebugBox />
    </div>
  );
}
