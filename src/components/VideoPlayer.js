// src/components/VideoPlayer.js
import React, { useEffect, useRef, useState } from 'react';

/** === Helpers de URL/proxy ============================================ **/
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
    const origin = window.location.origin;
    const absBase = new URL(baseProxied, origin);
    const abs = new URL(relative, absBase);
    return rewriteAbsoluteToProxy(abs.href);
  } catch {
    return relative;
  }
};
/** ====================================================================== **/

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
  debug = true, // 👈 activo por defecto
}) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');
  const [debugLines, setDebugLines] = useState([]);

  const log = (...args) => {
    const line = args.join(' ');
    // eslint-disable-next-line no-console
    console.log('[PLAYER]', line);
    setDebugLines((d) => [...d, line].slice(-40));
  };

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
      log('❌', msg);
      onError?.(new Error(msg));
    };
    const ready = () => {
      settled = true;
      setStatus('ready');
      log('✅ READY');
    };

    log('finalSrc:', finalSrc || '(vacío)');

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

    // PRECHECK: manifiesto + primer media vía proxy universal
    const controller = new AbortController();
    const precheck = (async () => {
      log('↓ Manifest:', finalSrc);
      const r = await fetch(finalSrc, { cache: 'no-store', signal: controller.signal });
      const st = r.headers.get('x-proxy-status') || r.status;
      log('↑ Manifest status:', st);
      if (!r.ok) throw new Error(`Manifest HTTP ${st}`);
      const text = await r.text();
      const lines = text.split(/\r?\n/).filter(Boolean);

      let firstMedia = '';
      for (const line of lines) {
        if (!line.trim().startsWith('#')) { firstMedia = line.trim(); break; }
      }
      if (firstMedia) {
        const probe = resolveRelativeViaProxy(finalSrc, firstMedia);
        log('↓ First media:', probe);
        const r2 = await fetch(probe, {
          method: 'GET',
          headers: { range: 'bytes=0-1' },
          cache: 'no-store',
          signal: controller.signal,
        });
        const st2 = r2.headers.get('x-proxy-status') || r2.status;
        log('↑ First media status:', st2);
        if (!r2.ok) throw new Error(`Media HTTP ${st2}`);
      } else {
        log('manifest sin media directa (variante m3u8), continuará con hls.js');
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
        await precheck; // si falla, fail() ya se llamó
        if (settled) return;

        await loadHlsScript();

        if (window.Hls && window.Hls.isSupported()) {
          const BaseLoader = window.Hls.DefaultConfig.loader;
          class ProxyLoader extends BaseLoader {
            load(context, config, callbacks) {
              try {
                let u = context?.url;
                if (typeof u === 'string' && u) {
                  if (!/^https?:\/\//i.test(u) && typeof context?.frag?.baseurl === 'string') {
                    const abs = new URL(u, context.frag.baseurl).href;
                    context.url = rewriteAbsoluteToProxy(abs);
                  } else {
                    context.url = rewriteToProxy(u);
                  }
                  if (debug) log('HLS load ->', context.url);
                }
              } catch (e) {
                if (debug) log('HLS load rewrite error:', e?.message || e);
              }
              super.load(context, config, callbacks);
            }
          }

          hls = new window.Hls({
            enableWorker: true,
            loader: ProxyLoader,
          });

          hls.on(window.Hls.Events.ERROR, (_evt, data) => {
            const fatal = data?.fatal;
            const t = data?.type || 'unknown';
            const d = data?.details || '';
            log('HLS ERROR:', t, d, 'fatal=', fatal);
            if (fatal || String(t).toLowerCase().includes('network')) {
              clearTimeout(timeoutId);
              fail(`HLS error${fatal ? ' (fatal)' : ''}: ${t} ${d}`);
              try { hls.destroy(); } catch {}
            }
          });

          hls.on(window.Hls.Events.LEVEL_LOADED, (_evt, data) => {
            if (debug) log('LEVEL_LOADED:', 'frag', data?.details?.fragments?.length ?? '?');
          });
          hls.on(window.Hls.Events.FRAG_LOADED, (_evt, data) => {
            if (debug) log('FRAG_LOADED:', data?.frag?.relurl || '(?)');
          });
          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            clearTimeout(timeoutId);
            log('MANIFEST_PARSED');
            ready();
            if (autoPlay) video.play().catch(() => {});
          });

          hls.loadSource(finalSrc);
          hls.attachMedia(video);
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
  }, [finalSrc, autoPlay, onError, debug]);

  if (status === 'loading') {
    return (
      <div className="w-full aspect-video bg-black/70 text-white flex items-center justify-center rounded-lg">
        Cargando video…
        {debug && (
          <div className="absolute bottom-2 left-2 right-2 text-[11px] opacity-70">
            <pre className="whitespace-pre-wrap">{debugLines.join('\n')}</pre>
          </div>
        )}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-full aspect-video bg-black/70 text-red-300 p-4 rounded-lg overflow-auto relative">
        <div className="font-semibold mb-2">No se pudo reproducir el canal</div>
        <div className="text-sm opacity-90 mb-2">{errorMsg}</div>
        <ul className="text-sm opacity-80 list-disc pl-5">
          <li>La URL se reescribe a <code>/hls/&lt;scheme&gt;/&lt;host&gt;/…</code>.</li>
          <li>Abre DevTools → Network y filtra por <code>hls</code>, <code>m3u8</code> o <code>.ts</code>.</li>
          <li>Revisa el header <code>x-proxy-status</code> (debe ser 200).</li>
        </ul>
        {debug && (
          <div className="absolute bottom-2 left-2 right-2 text-[11px] opacity-80 text-red-200">
            <pre className="whitespace-pre-wrap">{debugLines.join('\n')}</pre>
          </div>
        )}
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
