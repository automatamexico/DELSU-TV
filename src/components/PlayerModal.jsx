// src/components/PlayerModal.jsx
import React from "react";
import { X } from "lucide-react";
import VideoPlayer from "./VideoPlayer";
import useIncrementView from "../hooks/useIncrementView";

export default function PlayerModal({ open, onClose, channel }) {
  if (!open || !channel) return null;

  // Cuenta la vista UNA vez cuando se abre con un canal válido
  useIncrementView(channel?.id, true);

  const title =
    channel?.title ||
    channel?.name ||
    channel?.channel_name ||
    "Canal";

  return (
    <div className="fixed inset-0 z-50">
      {/* Fondo */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Contenedor del modal */}
      <div className="relative mx-auto my-8 w-[95%] max-w-6xl rounded-2xl overflow-hidden bg-[#0b1016] ring-1 ring-white/10">
        {/* Header: título + botón cerrar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#121821] border-b border-white/10">
          <h2 className="text-sm sm:text-base font-semibold text-white truncate">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm bg-white/10 hover:bg-white/15 text-white"
          >
            <X className="h-4 w-4" />
            <span>Cerrar</span>
          </button>
        </div>

        {/* Cuerpo: reproductor */}
        <div className="bg-black">
          <VideoPlayer channel={channel} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
