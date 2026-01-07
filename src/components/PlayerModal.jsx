// src/components/PlayerModal.jsx
import React, { useEffect } from "react";
import { X } from "lucide-react";
import VideoPlayer from "./VideoPlayer";

export default function PlayerModal({ open, onClose, channel }) {
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && open && onClose?.();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open || !channel) return null;

  const src = channel.m3u8Url || channel.streamUrl || channel.url || "";
  const title = channel.name || "Reproductor";
  const poster =
    channel.poster ||
    channel.image ||
    channel.thumbnail ||
    "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1200&auto=format&fit=crop";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[101] w-[95vw] max-w-6xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
          <h3 className="text-white font-semibold truncate">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm"
          >
            <X className="w-4 h-4" /> Cerrar
          </button>
        </div>

        <VideoPlayer src={src} title={title} poster={poster} hideSource />
      </div>
    </div>
  );
}
