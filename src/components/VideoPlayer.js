// src/components/VideoPlayer.js
import React, { useEffect, useRef, useState } from 'react';

/* ========= Helpers de proxy universal ========= */
// Convierte cualquier URL absoluta a /hls/<scheme>/<host>/<path>?<query>
const rewriteAbsoluteToProxy = (absUrl) => {
  try {
    const u = new URL(absUrl);
    const scheme = u.protocol.replace(':', '').toLowerCase(); // http|https
    return `/hls/${scheme}/${u.hostname}${u.pathname}${u.search}`;
  } catch {
    return absUrl;
  }
};
// Si ya es absoluta -> proxificar; si es relativa, se deja (se resolverá después)
const rewriteToProxy = (url) => {
  if (!url || typeof url !== 'string') return '';
  const httpsUrl = url.replace(/^http:\/\//i, 'https://');
  if (/^https?:\/\//i.test(httpsUrl)) return rewriteAbsoluteToProxy(httpsUrl);
  return httpsUrl;
};
// Resuelve relativa contra baseProxied y proxifica
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
 * Props sugeridas:
 *  - src: string  (pásame tu .m3u8 original)
 *  - poster, controls, autoPlay, muted
 */
export default function VideoPlayer({
  src,
  poster = '',
  controls = true,
  autoPlay = true,
  muted = true,
}) {
  const videoRef = useRef(null);
  const proxiedSrc = rewriteToProxy(src || '');
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');
  const [log, setLog] = useState([
    `finalSrc = ${proxiedSrc || '(vacío)'}`,
    `original = ${src || '(vacío)'}`
  ]);
  const push = (m) => setLog((d) => [...d, m].slice(-100));

  useEffect(() => {
    let hls;
    let timeoutId;
    let done = false;
    const video = videoRef.current;
    if (!video) return () => {};

    const fail = (msg) => {
      if (done) return;
      done = true;
      setErrorMsg(msg);
      setStatus('error');
      push(`❌ ${msg}`);
    };
    const ready = () => {
      if (done) return;
      done = true;
      setStatus('ready');
      push('✅ READY');
      if (autoPlay) video.play().catch(() => {});
    };

    if (!proxiedSrc) {
      fail('No hay fuente de video (src vacío).');
      return () => {};
    }
    if (window.location.protocol === 'https:' && proxiedSrc.startsWith('http://')) {
      fail('Mixed Content: el sitio es HTTPS y el stream es HTTP. Usa HTTPS o /hls/.');
      return () => {};
    }

    timeoutId = setTimeout(() => {
      if (!done) fail('Tiempo de espera agotado (posible bloqueo).');
    }, 12000);

    // PRECHECK: manifest + primer media
    const controller = new AbortController();
    const precheck = (async () => {
      try {
        push(`↓ Manifest: ${proxiedSrc}`);
        const r = await fetch(proxiedSrc, { cache: 'no-store', signal: controller.signal });
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
          const url = resolveRelativeViaProxy(proxiedSrc, firstMedia);
          push(`↓ First media: ${url}`);
          const r2 = await fetch(url, {
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
      } catch (e) {
        push(`❌ PRECHECK: ${e?.message || e}`);
        throw e;
      }
    })();

    const attachNative = () => {
      video.src = proxiedSrc;
      video.addEventListener('canplay', ready, { once: true });
      video.addEventListener('error', () => {
        const code = video.error?.code;
        fail(code ? `Error de reproducción (code ${code})` : 'Error de reproducción');
      });
      video.load();
    };

    const setup = async () => {
      try {
        await precheck; // si falla, lanzará error arriba
        if (done) return;

        await loadHlsScript();

        if (window.Hls && window.Hls.isSupported()) {
          const BaseLoader = window.Hls.DefaultConfig.loader;
          class ProxyLoader extends BaseLoader {
            load(context, config, callbacks) {
              try {
                const u = context?.url;
                if (typeof u === 'string' && u) {
                  if (/^https?:\/\//i.test(u)) {
                    context.url = rewriteAbsoluteToProxy(u);
                  } else if (typeof context?.frag?.baseurl === 'string') {
                    const abs = new URL(u, context.frag.baseurl).href;
                    context.url = rewriteAbsoluteToProxy(abs);
                  } else {
                    const abs2 = new URL(u, new URL(proxiedSrc, window.location.origin)).href;
                    context.url = rewriteAbsoluteToProxy(abs2);
                  }
                  push(`HLS load → ${context.url}`);
                }
              } catch (e) {
                push(`HLS rewrite error: ${e?.message || e}`);
              }
              super.load(context, config, callbacks);
            }
          }

          hls = new window.Hls({ enableWorker: true, loader: ProxyLoader });

          hls.on(window.Hls.Events.ERROR, (_evt, data) => {
            push(`HLS ERROR: ${data?.type || 'unknown'} ${data?.details || ''} fatal=${String(data?.fatal)}`);
            if (data?.fatal || String(data?.type || '').toLowerCase().includes('network')) {
              fail(`HLS error${data?.fatal ? ' (fatal)' : ''}: ${data?.type || ''} ${data?.details || ''}`);
              try { hls.destroy(); } catch {}
            }
          });
          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            clearTimeout(timeoutId);
            push('MANIFEST_PARSED');
            ready();
          });

          hls.loadSource(proxiedSrc);
          hls.attachMedia(video);
        } else {
          // Safari / iOS
          attachNative();
        }
      } catch (e) {
        clearTimeout(timeoutId);
        fail(e?.message || String(e));
      }
    };

    setup();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
      if (hls) { try { hls.destroy(); } catch {} }
      if (video) {
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [proxiedSrc, autoPlay]);

  // UI con depuración visible SIEMPRE
  return (
    <div className="w-full">
      {status === 'loading' && (
        <div className="w-full aspect-video bg-black/70 text-white flex flex-col items-center justify-center rounded-lg p-3">
          <div>Cargando video…</div>
        </div>
      )}
      {status === 'error' && (
        <div className="w-full aspect-video bg-black/70 text-red-300 p-3 rounded-lg overflow-auto">
          <div className="font-semibold mb-1">No se pudo reproducir el canal</div>
          <div className="text-sm opacity-90 mb-2">{errorMsg}</div>
          <div className="text-xs opacity-80">
            Intenta abrir <a className="underline" href={proxiedSrc} target="_blank" rel="noreferrer">esta URL</a> en otra pestaña.
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        poster={poster}
        controls={controls}
        muted={muted}
        playsInline
        className="w-full rounded-lg"
        style={{ display: status === 'ready' ? 'block' : 'none' }}
      />
      <div className="mt-2 text-xs leading-4 text-gray-200 bg-black/40 p-2 rounded max-h-40 overflow-auto">
        <div className="font-semibold mb-1">DEBUG</div>
        <pre className="whitespace-pre-wrap break-all m-0">{log.join('\n')}</pre>
      </div>
    </div>
  );
}
