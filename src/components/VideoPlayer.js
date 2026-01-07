// src/components/VideoPlayer.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import { X } from 'lucide-react';

export default function VideoPlayer({ title = 'Reproductor', src, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef/** @type {React.MutableRefObject<Hls|null>} */(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [steps, setSteps] = useState([]);

  // Toggle debug con ?debug=1
  const debug = useMemo(() => {
    try { return new URLSearchParams(window.location.search).get('debug') === '1'; }
    catch { return false; }
  }, []);

  const log = useCallback(
    (msg, extra) => {
      if (!debug) return;
      setSteps(s => [...s, { t: new Date().toISOString(), msg, extra }]);
    },
    [debug]
  );

  // Usar la URL tal cual (ya permitida por CSP)
  const finalSrc = useMemo(() => (src || '').trim(), [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !finalSrc) return;

    setLoading(true);
    setErrorMsg('');
    setSteps([]);

    let timeoutId;

    const clearAll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      try {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      } catch {}
      try {
        video.pause?.();
        video.removeAttribute('src');
        video.load?.();
      } catch {}
    };

    const startTimeout = () => {
      timeoutId = setTimeout(() => {
        setErrorMsg('No se pudo iniciar la reproducción (timeout).');
        setLoading(false);
        log('⏱ Timeout de arranque', {});
      }, 12000);
    };

    const tryAutoplay = async () => {
      try {
        video.muted = true;
        await video.play();
      } catch (e) {
        log('⚠️ Autoplay bloqueado', { e: String(e) });
      }
    };

    try {
      // Safari / iOS: HLS nativo
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        log('HLS nativo', {});
        startTimeout();
        video.src = finalSrc;

        const onLoaded = () => {
          setLoading(false);
          if (timeoutId) clearTimeout(timeoutId);
          tryAutoplay();
        };
        const onErr = () => {
          setErrorMsg('No se pudo iniciar la reproducción.');
          setLoading(false);
        };

        video.addEventListener('loadeddata', onLoaded);
        video.addEventListener('error', onErr);

        return () => {
          video.removeEventListener('loadeddata', onLoaded);
          video.removeEventListener('error', onErr);
          clearAll();
        };
      }

      // Otros navegadores: Hls.js
      if (Hls.isSupported()) {
        log('Hls.js cargado', {});
        startTimeout();

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
          fragLoadingTimeout: 15000,
          manifestLoadingTimeOut: 15000,
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.ERROR, (_, data) => {
          log('HLS ERROR', { type: data?.type, details: data?.details, fatal: data?.fatal });
          if (data?.fatal) {
            setErrorMsg(`Error HLS: ${data.type || 'fatal'}`);
            setLoading(false);
            try { hls.destroy(); } catch {}
          }
        });

        hls.on(Hls.Events.MEDIA_ATTACHED, () => log('MEDIA_ATTACHED', {}));
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          log('MANIFEST_PARSED', {});
          setLoading(false);
          if (timeoutId) clearTimeout(timeoutId);
          tryAutoplay();
        });
        hls.on(Hls.Events.LEVEL_LOADED, (_, d) => {
          log('LEVEL_LOADED', { live: d?.details?.live });
        });

        hls.attachMedia(video);
        hls.loadSource(finalSrc);

        return () => clearAll();
      }

      // Fallback simple
      log('Fallback simple', {});
      startTimeout();
      video.src = finalSrc;

      const onLoaded = () => {
        setLoading(false);
        if (timeoutId) clearTimeout(timeoutId);
        tryAutoplay();
      };
      const onErr = () => {
        setErrorMsg('No se pudo iniciar la reproducción.');
        setLoading(false);
      };

      video.addEventListener('loadeddata', onLoaded);
      video.addEventListener('error', onErr);

      return () => {
        video.removeEventListener('loadeddata', onLoaded);
        video.removeEventListener('error', onErr);
        clearAll();
      };
    } catch (e) {
      setErrorMsg('Error inicializando el reproductor.');
      setLoading(false);
      log('Excepción useEffect', { e: String(e) });
      return () => clearAll();
    }
  }, [finalSrc, log]);

  return (
    <div className="fixed inset-0 z-[999] flex items-start md:items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-5xl rounded-xl bg-[#0f1216] border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-white font-semibold truncate">{title}</h2>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X size={16} /> Cerrar
          </button>
        </div>

        {/* Video */}
        <div className="relative bg-black">
          <video
            ref={videoRef}
            className="w-full aspect-video"
            controls
            playsInline
            preload="auto"
          />
          {loading && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-white/80 text-sm">Cargando video...</div>
            </div>
          )}
        </div>

        {/* Error sin exponer fuente */}
        {errorMsg && (
          <div className="px-4 py-3 text-sm text-red-400 border-t border-white/10">
            {errorMsg}
          </div>
        )}

        {/* Debug opcional */}
        {debug && (
          <div className="px-4 py-3 text-xs text-white/70 border-t border-white/10 space-y-1 max-h-40 overflow-auto">
            <div className="font-semibold text-white/80">DEBUG</div>
            <div>src (oculto)</div>
            {steps.map((s, i) => (
              <div key={i}>
                • [{s.t}] {s.msg} {s.extra ? `| ${JSON.stringify(s.extra)}` : ''}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
