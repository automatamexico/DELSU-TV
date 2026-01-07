// src/components/VideoPlayer.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import { X, Loader2 } from 'lucide-react';

function toProxied(url) {
  try {
    const u = new URL(url, window.location.origin);
    if (u.pathname.startsWith('/hls/')) return u.pathname + u.search;
    if (u.hostname.toLowerCase().includes('streamhoster.com')) {
      return `/hls${u.pathname}${u.search}`;
    }
    return u.toString();
  } catch {
    return url; // relativa
  }
}

export default function VideoPlayer({ channel, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [status, setStatus] = useState('init'); // init | loading | playing | error
  const [errorMsg, setErrorMsg] = useState('');
  const [events, setEvents] = useState([]);

  const { name = 'Canal', poster, stream_url: originalSrc } = channel || {};
  const srcResolved = useMemo(() => (originalSrc ? toProxied(originalSrc) : ''), [originalSrc]);

  const debug = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('debug') === '1';
    } catch {
      return false;
    }
  }, []);

  const log = (label, data) => {
    if (!debug) return;
    setEvents(prev => {
      const now = new Date();
      return [...prev, { t: now.toISOString().split('T')[1].replace('Z', ''), label, data }];
    });
    // eslint-disable-next-line no-console
    console.log('[VideoPlayer]', label, data || '');
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !srcResolved) return;

    let watchdog;

    const cleanup = () => {
      if (watchdog) clearTimeout(watchdog);
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch {}
        hlsRef.current = null;
      }
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch {}
    };

    const start = async () => {
      setStatus('loading');
      setErrorMsg('');
      setEvents([]);

      try {
        // 1) Preferir Hls.js cuando esté disponible (evita “modo nativo” en Chrome/Edge)
        if (Hls.isSupported()) {
          log('HLS_START', { src: srcResolved });
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            xhrSetup: (xhr) => { xhr.withCredentials = false; },
          });
          hlsRef.current = hls;

          hls.on(Hls.Events.MEDIA_ATTACHED, () => log('MEDIA_ATTACHED'));
          hls.on(Hls.Events.MANIFEST_LOADING, () => log('MANIFEST_LOADING'));
          hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
            log('MANIFEST_PARSED', { levels: (data?.levels?.length) || 0 });
            // Autoplay robusto
            video.muted = true;
            video.play()
              .then(() => { setStatus('playing'); log('PLAY_OK'); })
              .catch(err => {
                setStatus('error');
                setErrorMsg('No se pudo iniciar la reproducción. Presiona ▶️.');
                log('PLAY_FAIL', { err: String(err) });
              });
          });
          hls.on(Hls.Events.LEVEL_LOADED, (_e, data) => log('LEVEL_LOADED', { details: !!data?.details }));
          hls.on(Hls.Events.ERROR, (_e, data) => {
            log('HLS_ERROR', { type: data?.type, details: data?.details, fatal: data?.fatal });
            if (data?.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  setErrorMsg('Recuperando red…'); hls.startLoad(); break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  setErrorMsg('Recuperando medios…'); hls.recoverMediaError(); break;
                default:
                  setStatus('error'); setErrorMsg('Error fatal del reproductor.'); hls.destroy();
              }
            }
          });

          hls.loadSource(srcResolved);
          hls.attachMedia(video);

          watchdog = setTimeout(() => {
            if (status !== 'playing') {
              setStatus('error');
              setErrorMsg('No se pudo cargar el manifiesto HLS. Revisa el proxy /hls/ y la CSP.');
              log('TIMEOUT_10S');
            }
          }, 10000);

          return;
        }

        // 2) Fallback nativo (Safari / iOS)
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          log('NATIVE_START', { src: srcResolved });
          video.src = srcResolved;
          video.muted = true;
          try {
            await video.play();
            setStatus('playing');
            log('NATIVE_PLAYING');
          } catch (err) {
            setStatus('error');
            setErrorMsg('No se pudo iniciar la reproducción (autoplay). Presiona ▶️.');
            log('NATIVE_PLAY_FAIL', { err: String(err) });
          }
          return;
        }

        setStatus('error');
        setErrorMsg('Tu navegador no soporta HLS.');
        log('NO_SUPPORT');
      } catch (err) {
        setStatus('error');
        setErrorMsg('Fallo al inicializar el reproductor.');
        log('INIT_FAIL', { err: String(err) });
      }
    };

    start();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcResolved, debug]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-5xl">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/80 hover:text-white flex items-center gap-2"
          aria-label="Cerrar"
        >
          <X className="w-6 h-6" /> Cerrar
        </button>

        <div className="mb-3 text-white/90 text-lg font-semibold">{name}</div>

        <div className="bg-black rounded-xl overflow-hidden border border-white/10">
          <video
            ref={videoRef}
            className="w-full h-[60vh] bg-black"
            poster={poster || undefined}
            controls
            playsInline
            autoPlay
            muted
          />
        </div>

        {status !== 'playing' && (
          <div className="mt-4 text-sm text-white/80">
            {status === 'loading' && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando video…
              </div>
            )}
            {status === 'error' && <div className="text-red-300">{errorMsg || 'No se pudo reproducir este canal.'}</div>}
          </div>
        )}

        {debug && (
          <div className="mt-4 p-3 rounded-lg bg-black/40 border border-white/10 text-xs max-h-48 overflow-auto text-white/80">
            <div className="mb-2 font-semibold">DEBUG</div>
            {events.length === 0 ? (
              <div className="opacity-70">Sin eventos aún…</div>
            ) : (
              <ul className="space-y-1">
                {events.map((e, i) => (
                  <li key={i} className="font-mono">
                    [{e.t}] {e.label} {e.data ? <span className="opacity-80">{JSON.stringify(e.data)}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
