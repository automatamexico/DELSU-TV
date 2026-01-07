// src/components/ChannelCard.jsx
import React from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";

export default function ChannelCard({ channel, onClick }) {
  // Toma de la tabla channels (con fallbacks por si cambian los nombres)
  const title =
    channel?.title ||
    channel?.name ||
    channel?.channel_name ||
    "Canal sin nombre";

  const poster =
    channel?.poster_url ||
    channel?.poster ||
    channel?.thumbnail ||
    "/poster-fallback.jpg"; // opcional

  const category =
    channel?.category || channel?.categoria || channel?.genre || "—";

  const country = channel?.country || channel?.pais || "—";

  const description =
    channel?.description || channel?.descripcion || channel?.about || "";

  return (
    <button
      onClick={() => onClick?.(channel)}
      className="group w-full text-left rounded-xl overflow-hidden bg-gray-900/40 border border-gray-800 hover:border-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500/40 transition"
    >
      {/* Poster alto (vertical) */}
      <div className="relative">
        {/* 3/4 en móviles, 2/3 desde md en adelante */}
        <div className="aspect-[3/4] md:aspect-[2/3] w-full overflow-hidden bg-gray-800">
          {/* Puedes usar img normal si no usas este paquete */}
          <LazyLoadImage
            src={poster}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            effect="opacity"
          />
        </div>

        {/* Etiqueta categoría en esquina */}
        <div className="absolute left-2 top-2">
          <span className="text-[11px] px-2 py-1 rounded-full bg-rose-500/90 text-white shadow">
            {category}
          </span>
        </div>
      </div>

      {/* Texto */}
      <div className="p-3 space-y-1.5">
        <h3 className="text-[15px] font-semibold text-white line-clamp-1">
          {title}
        </h3>

        <div className="text-[12px] text-gray-400 flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="i-ph:map-pin-duotone" />
            {country}
          </span>
        </div>

        {/* Descripción (2 líneas) */}
        {description ? (
          <p className="text-[12px] leading-4 text-gray-400 line-clamp-2 mt-1.5">
            {description}
          </p>
        ) : null}
      </div>
    </button>
  );
}
