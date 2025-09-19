// src/components/VideoPlayer.js
import React, { useEffect, useRef, useState } from 'react';

// Convierte URL original -> /hls/... para pasar por el proxy
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

// Convierte ruta relativa del manifest a URL absoluta basada en finalSrc
const resolveRelative = (basePath, relative) => {
  try {
    if (/^https?:\/\//i.test(relative) || relative.startsWith('/hls/')) {
      return relative;
    }
    const base = new URL(basePath, window.location.origin);
    const abs = new URL(relative, base);
    return abs.pathname + abs.search; // mantenemos /hls/...
  } catch {
    return relative;
  }
};

/**
 * Props:
 * - src?: string   → URL directa (m3u8/mp4). Si no viene, usa 'channel'.
 * - channel?: obj  → campos { stream_url | streamUrl | m3u8 | url }
 * - poster?: string
 * - autoPlay?: boolean
 * - controls?: boolean
 * - muted?: boolean (por defecto true para evitar bloqueos de autoplay)
 * - onError?: (err) => void
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

  // Deriva fuente (src o channel.*) y proxéala
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

    // ⏳ Timeout de seguridad (12s)
    timeoutId = setTimeout(() => {
      if (!settled) fail('Tiempo de espera agotado al cargar el video (posible CORS/hotlink).');
    }, 12000);

    // 🔎 PRECHECK: descargar manifest y probar 1er media (.ts o child m3u8)
    const precheck = (async () => {
      // 1) fetch manifest
      const r = await fetch(finalSrc, { cache: 'no-store' });
      const statusHdr = r.headers.get('x-proxy-status');
      if (!r.ok) throw new Error(`Manifest HTTP ${statusHdr || r.status}`);
      const text = await r.text();

      // 2) busca primera línea no comentario
      const lines = text.split(/\r?\n/).filter(Boolean);
      let firstMedia = '';
      for (const line of lines) {
        if (!line.trim().startsWith('#')) { firstMedia = line.trim(); break; }
      }
      if (!firstMedia) return; // algunos manifests cargan al volar otro manifest

      // 3) resuelve URL del primer media relativo al manifest
      const mediaUrl = resolveRelative(finalSrc, firstMedia);

      // 4) HEAD o Range para verificar acceso
      const r2 = await fetch(mediaUrl, {
        method: 'GET',
        headers: { range: 'bytes=0-1' },
        cache: 'no-store',
      });
      const status2 = r2.headers.get('x-proxy-status') || r2.status;
      if (!r2.ok) throw new Error(`Media HTTP ${status2}`);
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
        // Espera precheck (si falla, mostrará el error)
        await precheck;
        if (settled) return;

        // HLS nativo (Safari/iOS)
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          attachNative();
          return;
        }

        // hls.js para Chrome/Firefox/etc.
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
        fail(e?.message || String(e));
      }
    };

    setup();

    return () => {
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
          <li>La URL debe pasar por <code>/hls/</code> (el componente ya la reescribe solo).</li>
          <li>Abre DevTools → Network y revisa <code>x-proxy-status</code> del <code>.m3u8</code> y <code>.ts</code>.</li>
          <li>Si ves <strong>403/401</strong>, el origen bloquea por referer/UA/IP. El proxy ya envía referer/UA; si persiste, el proveedor está filtrando IPs de cloud.</li>
        </ul>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      poster={poster}
      controls={controls}
      muted={muted}      // ← ayuda a que autoplay no sea bloqueado
      playsInline
      className="w-full rounded-lg"
    />
  );
}
