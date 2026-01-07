// src/components/VideoPlayer.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import { X } from 'lucide-react';

export default function VideoPlayer({ title = 'Reproductor', src, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Permite activar depuración solo si la URL trae ?debug=1
  const showDebug = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('debug') === '1';
    } catch {
      return false;
    }
  }, []);

  // Si te llega una URL https://host/... la proxificamos como /hls/host/...
  const finalSrc = useMemo(() => {
    if (!src) return '';
    if (/^https?:\/\//i.test(src)) {
      return '/hls/' + src.replace(/^https?:\/\//i, '');
    }
    // ya viene proxificada
    return src.startsWith('/hls/') ? src : '/hls/' + src;
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !finalSrc) return;

    setLoading(true);
    setErrorMsg('');

    // Si el navegador soporta HLS nativo (Safari), usa source directo
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = finalSrc;
      video.addEventListener('loadedmetadata', () => setLoading(false));
      video.addEventListener('error', () => setErrorMsg('No se pudo iniciar la reproducción.'));
      video.play().catch(() => {});
      return () => {
        video.pause();
        video.removeAttribute('src');
        video.load();
      };
    }

    // Hls.js para navegadores sin HLS nativo
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        fragLoadingTimeout: 15000,
        manifestLoadingTimeOut: 15000,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data?.fatal) {
          setErrorMsg(`Error HLS: ${data?.type || 'fatal'}`);
          try { hls.destroy(); } catch {}
        }
      });

      hls.loadSource(finalSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(() => {});
      });

      return () => {
        try { hls.destroy(); } catch {}
      };
    }

    // Fallback muy básico
    video.src = finalSrc;
    video.addEventListener('loadedmetadata', () => setLoading(false));
    video.addEventListener('error', () => setErrorMsg('No se pudo iniciar la reproducción.'));
    video.play().catch(() => {});
    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [finalSrc]);

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
              <div className="text-white/80 text-sm">Cargando video…</div>
            </div>
          )}
        </div>

        {/* Errores visibles (sin URL fuente) */}
        {errorMsg && (
          <div className="px-4 py-3 text-sm text-red-400 border-t border-white/10">
            {errorMsg}
          </div>
        )}

        {/* Panel de depuración (oculto por defecto; solo con ?debug=1) */}
        {showDebug && (
          <div className="px-4 py-3 text-xs text-white/70 border-t border-white/10">
            <div className="font-semibold text-white/80 mb-1">DEBUG</div>
            <div>finalSrc = {finalSrc}</div>
          </div>
        )}
      </div>
    </div>
  );
}
