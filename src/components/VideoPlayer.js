// src/components/VideoPlayer.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import { X, Loader2 } from 'lucide-react';

function toProxied(url) {
  try {
    // Si es absoluta (http/https) y es streamhoster, la pasamos por /hls/...
    const u = new URL(url, window.location.origin);
    const host = u.hostname.toLowerCase();

    // Si ya viene proxificada (/hls/...) la dejamos igual
    if (u.pathname.startsWith('/hls/')) return u.pathname + u.search;

    // Proxy para streamhoster (ajusta aquí si quieres añadir otros hostnames)
    if (host.includes('streamhoster.com')) {
      // /hls/<todo-el-path-del-manifest>
      return `/hls${u.pathname}${u.search}`;
    }

    // Otras URLs absolutas: las dejamos como están (si necesitas proxy, añade condición arriba)
    return u.toString();
  } catch {
    // Si es relativa (p. ej. /hls/...), la regresamos tal cual
    return url;
  }
}

export default function VideoPlayer({ channel, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [status, setStatus] = useState('init'); // init | loading | playing | error
  const [errorMsg, setErrorMsg] = useState('');
  const [events, setEvents] = useState([]);

  // NO mostramos la fuente (URL) — solo nombre/poster
  const { name = 'Canal', poster, stream_url: originalSrc } = channel || {};

  // Debug solo si ?debug=1
  const debug = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('debug') === '1';
    } catch {
      return false;
    }
  }, []);

  const srcResolved = useMemo(() => {
    if (!originalSrc) return '';
    return toProxied(originalSrc);
  }, [originalSrc]);

  // Utilidad simple para loguear eventos en modo debug
  const log = (label, data) => {
    if (!debug) return;
    setEvents(prev => {
      const now = new Date();
      return [
        ...prev,
        {
          t: now.toISOString().split('T')[1].replace('Z', ''),
          label,
          data
        }
      ];
    });
    // eslint-disable-next-line no-console
    console.log('[VideoPlayer]', label, data || '');
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !srcResolved) return;

    let timeoutId;

    const cleanUp = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch (e) {
          // ignore
        }
        hlsRef.current = null;
      }
      // limpiar src para evitar fugas
      if (video) {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch (e) {
          // ignore
        }
      }
    };

    setStatus('loading');
    setErrorMsg('');
    setEvents([]);

    const startPlayback = async () => {
      try {
        // iOS / Safari soporta HLS nativo
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          log('NATIVE_START', { src: srcResolved });
          video.src = srcResolved;
          await video.play().catch(() => video.muted = true).then(() => video.play().catch(() => {}));
          setStatus('playing');
          log('NATIVE_PLAYING');
          return;
        }

        if (Hls.isSupported()) {
          log('HLS_START', { src: srcResolved });
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            // Evita credenciales si no las necesitas
            xhrSetup: (xhr) => {
              xhr.withCredentials = false;
            }
          });
          hlsRef.current = hls;

          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            log('MEDIA_ATTACHED');
          });
          hls.on(Hls.Events.MANIFEST_LOADING, () => {
            log('MANIFEST_LOADING');
          });
          hls.on(Hls.Events.MANIFEST_PARSED, (ev, data) => {
            log('MANIFEST_PARSED', { levels: (data && data.levels && data.levels.length) || 0 });
            video
              .play()
              .then(() => {
                setStatus('playing');
                log('PLAY_OK');
              })
              .catch((err) => {
                // Autoplay policy — forzamos muted y reintento
                video.muted = true;
                video.play().then(() => {
                  setStatus('playing');
                  log('PLAY_OK_MUTED');
                }).catch((e2) => {
                  setStatus('error');
                  setErrorMsg('No se pudo iniciar la reproducción (autoplay). Toca el botón ▶️.');
                  log('PLAY_FAIL', { err: String(e2) });
                });
              });
          });
          hls.on(Hls.Events.LEVEL_LOADED, (ev, data) => {
            log('LEVEL_LOADED', { details: !!data?.details });
          });
          hls.on(Hls.Events.ERROR, (ev, data) => {
            log('HLS_ERROR', { type: data?.type, details: data?.details, fatal: data?.fatal });
            if (data?.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  setStatus('loading');
                  setErrorMsg('Recuperando red…');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  setStatus('loading');
                  setErrorMsg('Recuperando medios…');
                  hls.recoverMediaError();
                  break;
                default:
                  setStatus('error');
                  setErrorMsg('Error fatal del reproductor.');
                  hls.destroy();
                  break;
              }
            }
          });

          hls.loadSource(srcResolved);
          hls.attachMedia(video);

          // Watchdog: si en 10s no parsea manifest → error visible
          timeoutId = setTimeout(() => {
            if (status !== 'playing') {
              setStatus('error');
              setErrorMsg('No se pudo cargar el manifiesto HLS. Verifica el proxy /hls/ y el origen.');
              log('TIMEOUT_10S');
            }
          }, 10000);
          return;
        }

        // Si llegamos aquí, ni nativo ni Hls.js soportado
        setStatus('error');
        setErrorMsg('Tu navegador no soporta HLS.');
        log('NO_SUPPORT');
      } catch (err) {
        setStatus('error');
        setErrorMsg('Fallo al inicializar el reproductor.');
        log('INIT_FAIL', { err: String(err) });
      }
    };

    startPlayback();

    return () => {
      cleanUp();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcResolved, debug]); // incluimos debug para reiniciar logs si activas ?debug=1

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-5xl">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/80 hover:text-white flex items-center gap-2"
          aria-label="Cerrar"
        >
          <X className="w-6 h-6" />
          Cerrar
        </button>

        {/* Título (sin URL) */}
        <div className="mb-3 text-white/90 text-lg font-semibold">
          {name}
        </div>

        {/* Contenedor del video */}
        <div className="bg-black rounded-xl overflow-hidden border border-white/10">
          <video
            ref={videoRef}
            className="w-full h-[60vh] bg-black"
            poster={poster || undefined}
            controls
            playsInline
            // Intento suave de autoplay: muchas veces requiere muted
            muted
          />
        </div>

        {/* Estado / errores */}
        {status !== 'playing' && (
          <div className="mt-4 text-sm text-white/80">
            {status === 'loading' && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando video…
              </div>
            )}
            {status === 'error' && (
              <div className="text-red-300">
                {errorMsg || 'No se pudo reproducir este canal.'}
              </div>
            )}
          </div>
        )}

        {/* Panel DEBUG solo cuando ?debug=1 */}
        {debug && (
          <div className="mt-4 p-3 rounded-lg bg-black/40 border border-white/10 text-xs max-h-48 overflow-auto text-white/80">
            <div className="mb-2 font-semibold">DEBUG</div>
            {events.length === 0 ? (
              <div className="opacity-70">Sin eventos aún…</div>
            ) : (
              <ul className="space-y-1">
                {events.map((e, i) => (
                  <li key={i} className="font-mono">
                    [{e.t}] {e.label}{' '}
                    {e.data ? <span className="opacity-80">{JSON.stringify(e.data)}</span> : null}
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
