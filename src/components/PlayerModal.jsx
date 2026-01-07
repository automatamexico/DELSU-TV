import React from "react";
import VideoPlayer from "./VideoPlayer";
import { X } from "lucide-react";

export default function PlayerModal({ open, onClose, channel }) {
  if (!open) return null;

  // Intenta varias propiedades por si tu objeto canal usa otro nombre
  const src =
    channel?.m3u8Url ||
    channel?.streamUrl ||
    channel?.hls ||
    channel?.url ||
    "";

  const poster =
    channel?.poster ||
    channel?.image ||
    channel?.thumbnail ||
    channel?.logo ||
    undefined;

  const title = channel?.name || channel?.title || "Reproductor";

  const urlParams = new URLSearchParams(window.location.search);
  const debug = urlParams.has("debug");

  return (
    <div className="fixed inset-0 z-[1000] flex items-start md:items-center justify-center bg-black/70 p-3 md:p-6">
      <div className="w-full max-w-6xl bg-[#0b0e12] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-white/90 font-semibold truncate">{title}</h2>
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-white/80 hover:text-white transition"
            aria-label="Cerrar"
          >
            <X size={18} />
            <span className="hidden sm:inline">Cerrar</span>
          </button>
        </div>

        <div className="p-3 md:p-4">
          {src ? (
            <VideoPlayer src={src} title={title} poster={poster} debug={debug} />
          ) : (
            <div className="text-red-300 text-sm">
              No se encontró URL del canal. Revisa que el objeto tenga
              <code className="mx-1 px-1 rounded bg-white/10">m3u8Url</code> o
              <code className="mx-1 px-1 rounded bg-white/10">streamUrl</code>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
