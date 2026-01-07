// src/components/ChannelGrid.jsx
import React from "react";

/**
 * Renderiza una grilla de canales. Llama onChannelClick(channel) al hacer clic.
 * Espera que cada channel tenga al menos: id (o name único), name, country, image/poster opcional,
 * y alguna URL de stream en m3u8 (m3u8Url | streamUrl | url).
 */
export default function ChannelGrid({ channels = [], onChannelClick }) {
  if (!Array.isArray(channels)) channels = [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-4">
      {channels.map((ch, idx) => {
        const key = ch.id ?? ch.slug ?? `${ch.name}-${idx}`;
        const poster =
          ch.poster ||
          ch.image ||
          ch.thumbnail ||
          "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1200&auto=format&fit=crop";

        return (
          <button
            key={key}
            type="button"
            onClick={() => {
              // Seguridad: evitar clicks sin handler
              if (typeof onChannelClick === "function") onChannelClick(ch);
              // Log útil para diagnóstico
              try {
                console.debug("[ChannelGrid] click", {
                  name: ch?.name,
                  country: ch?.country,
                  m3u8Url: ch?.m3u8Url || ch?.streamUrl || ch?.url,
                });
              } catch {}
            }}
            className="text-left bg-gray-800/50 hover:bg-gray-800 transition-colors border border-gray-700 rounded-xl overflow-hidden shadow-md focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <div className="aspect-[16/9] w-full overflow-hidden bg-black">
              <img
                src={poster}
                alt={ch?.name || "Canal"}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1200&auto=format&fit=crop";
                }}
              />
            </div>

            <div className="p-3">
              <div className="text-white font-semibold truncate">
                {ch?.name || "Canal"}
              </div>
              <div className="text-xs text-gray-400 mt-1 truncate">
                {ch?.country || "—"}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
