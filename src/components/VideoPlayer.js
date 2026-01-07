// src/components/VideoPlayer.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import { X, Play } from 'lucide-react';

function toProxied(src) {
  if (!src) return '';
  // ya proxied
  if (src.startsWith('/hls/')) return src;
  // convierte https://host/path.m3u8 -> /hls/host/path.m3u8
  const clean = src.replace(/^https?:\/\//i, '');
  return `/hls/${clean}`;
}

export default function VideoPlayer({ channel, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [error, setError] = useState('');
  const [showPlay, setShowPlay] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const finalSrc = useMemo(() => toProxied(channel?.stream_url || ''), [channel]);

  // Limpia instancia Hls al desmontar o cambiar de canal
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
    };
  }, []);

  // Inicializa el reproductor
  useEffect(() => {
    setError('');
    setShowPlay(false);
    setIsReady(false);

    const video = videoRef.current;
    if (!video || !finalSrc) {
      setError('No hay fuente de video (src vacío).');
      return;
    }

    // Helper: intenta reproducir lidiando con autoplay
    const tryPlay = async () => {
      try {
        video.muted = true;            // autoplay-friendly
        video.playsInline = true;      // iOS
        video.autoplay = true;
        await video.play();
        setIsReady(true);
        setShowPlay(false);
      } catch (e) {
        // Autoplay bloqueado: muestra botón ▶
        setShowPlay(true);
        setError('Autoplay bloqueado por el navegador. Pulsa ▶ para iniciar.');
      }
    };

    // Primero: Hls.js si es soportado
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        // Falla fatal: muestra error
        if (data?.fatal) {
          setError(`Error HLS: ${data?.type || ''} ${data?.details || ''}`);
          setShowPlay(false);
        }
      });

      try {
        hls.loadSource(finalSrc);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      } catch (e) {
        setError('No se pudo iniciar la reproducción (HLS.js).');
      }
      return;
    }

    // Fallback Safari/iOS con HLS nativo
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = finalSrc;
      const onCanPlay = () => tryPlay();
      video.addEventListener('canplay', onCanPlay, { once: true });
      video.addEventListener('loadedmetadata', onCanPlay, { once: true });
      // backup por si no dispara eventos
      const t = setTimeout(tryPlay, 1000);
      return () => clearTimeout(t);
    }

    setError('Este navegador no soporta HLS.');
  }, [finalSrc]);

  const handleManualPlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (video.paused) await video.play();
      setShowPlay(false);
      setError('');
    } catch (e) {
      setError('No se pudo iniciar la reproducción.');
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-5xl">
        {/* Título + cerrar */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white text-xl font-semibold">
            {channel?.name || 'Reproducción'}
          </h2>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md bg-gray-800/80 text-gray-200 hover:bg-gray-700 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cerrar
          </button>
        </div>

        {/* Player */}
        <div className="relative bg-black rounded-xl overflow-hidden shadow-xl">
          <video
            ref={videoRef}
            className="w-full aspect-video bg-black"
            controls
            playsInline
            // importante para policies
            muted
          />

          {/* Overlay de Play si el autoplay fue bloqueado */}
          {showPlay && (
            <button
              onClick={handleManualPlay}
              className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition"
              aria-label="Reproducir"
            >
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur px-5 py-3 rounded-xl border border-white/20">
                <Play className="w-6 h-6 text-white" />
                <span className="text-white font-semibold">Reproducir</span>
              </div>
            </button>
          )}
        </div>

        {/* Mensajes */}
        {!isReady && !showPlay && (
          <div className="mt-3 text-sm text-gray-300">Cargando video…</div>
        )}
        {error && (
          <div className="mt-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <div className="mt-2 text-xs text-gray-400">
          Fuente: <code>{finalSrc || '(vacía)'}</code>
        </div>
      </div>
    </div>
  );
}
