// src/components/PlayerModal.jsx
import React, { useEffect } from "react";
import { X } from "lucide-react";
import VideoPlayer from "./VideoPlayer";
import useIncrementView from "../hooks/useIncrementView";

// 🔔 Enviar ping al Edge para registrar la vista geolocalizada
function logGeoView(channelId) {
  if (!channelId) return;
  const url = `/log-view?channel_id=${encodeURIComponent(channelId)}`;
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url);
  } else {
    fetch(url, { method: "POST", keepalive: true });
  }
}

export default function PlayerModal({ open, onClose, channel }) {
  // Cuenta la vista UNA sola vez cuando hay modal abierto con canal válido
  const channelId = open && channel?.id ? channel.id : null;
  useIncrementView(channelId);

  // ➕ Registrar vista geolocalizada cuando se abre el modal con canal válido
  useEffect(() => {
    if (open && channel?.id) {
      logGeoView(channel.id);
    }
  }, [open, channel?.id]);

  if (!open || !channel) return null;

  const title =
    channel?.title || channel?.name || channel?.channel_name || "Canal";

  return (
    <div className="fixed inset-0 z-50">
      {/* Fondo */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Contenedor del modal */}
      <div className="relative mx-auto my-8 w-[95%] max-w-6xl rounded-2xl overflow-hidden bg-[#0b1016] ring-1 ring-white/10">
        {/* Header */}
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

        {/* Reproductor */}
        <div className="bg-black">
          <VideoPlayer channel={channel} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
