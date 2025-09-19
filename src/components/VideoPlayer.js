// src/components/VideoPlayer.js
import React, { useRef, useEffect, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react"; // 👈 SIN Settings
// Si usas HLS (.m3u8), tu proyecto podría inicializar hls.js aquí (opcional)

const VideoPlayer = ({ src, title = "Reproductor", autoPlay = false, muted = false }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = isMuted;
    if (autoPlay) {
      v.play().catch(() => setIsPlaying(false));
    }
  }, [autoPlay, isMuted]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const goFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.requestFullscreen) v.requestFullscreen();
  };

  return (
    <div className="w-full bg-black rounded-xl overflow-hidden border border-gray-800">
      <div className="relative aspect-video bg-black">
        {/* Si reproduces HLS, podrías usar hls.js o una <source type="application/x-mpegURL"> */}
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full"
          playsInline
          controls={false}
          autoPlay={autoPlay}
          muted={isMuted}
        />
        {/* Controles */}
        <div className="absolute inset-x-0 bottom-0 p-3 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-2 rounded-md bg-white/10 hover:bg-white/20 text-white"
              aria-label={isPlaying ? "Pausar" : "Reproducir"}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleMute}
              className="p-2 rounded-md bg-white/10 hover:bg-white/20 text-white"
              aria-label={isMuted ? "Activar sonido" : "Silenciar"}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goFullscreen}
              className="p-2 rounded-md bg-white/10 hover:bg-white/20 text-white"
              aria-label="Pantalla completa"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      {title && <div className="px-4 py-3 text-white text-sm border-t border-gray-800">{title}</div>}
    </div>
  );
};

export default VideoPlayer;
