// src/components/VideoPlayer.js
import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const isAbsoluteHttp = (u = '') => /^https?:\/\//i.test(u);

function buildFinalSrc(raw = '') {
  const src = (raw || '').trim();
  if (!src) return '';

  // Si ya viene proxied (/hls/...), úsalo tal cual
  if (src.startsWith('/hls/')) return src;

  // Si es http/https, proxiar con Edge Function
  if (isAbsoluteHttp(src)) return `/hls/${encodeURIComponent(src)}`;

  // Si no trae protocolo, asume https y proxía
  return `/hls/${encodeURIComponent(`https://${src}`)}`;
}

export default function VideoPlayer({ channel, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [status, setStatus] = useState('init'); // init | loading | playing | error | ended
  const [errorMsg, setErrorMsg] = useState('');

  // Acepta streamUrl (camel) o stream_url (snake) por compatibilidad
  const srcRaw = channel?.streamUrl || channel?.stream_url || channel?.url || '';
  const finalSrc = buildFinalSrc(srcRaw);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !finalSrc) {
      setStatus('error');
      setErrorMsg('No hay fuente de video (src vacío).');
      return;
    }

    setStatus('loading');

    const onPlaying = () => setStatus('playing');
    const onEnded = () => setStatus('ended');
    const onError = (e) => {
      console.error('[VideoPlayer] <video> error', e);
      setStatus('error');
      setErrorMsg('Error del reproductor.');
    };

    video.addEventListener('playing', onPlaying);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);

    const canNative = video.canPlayType('application/vnd.apple.mpegurl');

    if (canNative) {
      // Safari / algunos navegadores
      video.src = finalSrc;
      video.play().catch((err) => {
        console.error('[VideoPlayer] play() native error', err);
        setStatus('error');
        setErrorMsg('No se pudo iniciar la reproducción.');
      });
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data?.fatal) {
          console.error('[VideoPlayer] HLS fatal error', data);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setStatus('error');
              setErrorMsg('Error HLS fatal.');
              hls.destroy();
          }
        }
      });

      hls.loadSource(finalSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((err) => {
          console.error('[VideoPlayer] play() hls error', err);
          setStatus('error');
          setErrorMsg('No se pudo iniciar la reproducción (HLS).');
        });
      });
    } else {
      // Fallback muy básico
      video.src = finalSrc;
      video.play().catch((err) => {
        console.error('[VideoPlayer] play() basic error', err);
        setStatus('error');
        setErrorMsg('El navegador no soporta HLS.');
      });
    }

    return () => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
      try {
        hlsRef.current?.destroy();
        hlsRef.current = null;
      } catch {}
    };
  }, [finalSrc]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="absolute top-4 right-4">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white"
        >
          Cerrar
        </button>
      </div>

      <div className="w-full max-w-5xl px-4">
        <h2 className="text-white text-lg mb-3">{channel?.name || 'Canal'}</h2>

        <div className="bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            controls
            playsInline
            className="w-full h-[60vh] bg-black"
          />
        </div>

        {/* Mensaje pequeño si hay error */}
        {status === 'error' && (
          <p className="mt-3 text-sm text-red-400">
            No se pudo reproducir el canal. {errorMsg}
          </p>
        )}

        {status === 'loading' && (
          <p className="mt-3 text-sm text-gray-300">Cargando video…</p>
        )}
      </div>
    </div>
  );
}
