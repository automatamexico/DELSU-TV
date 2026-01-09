// src/components/ChannelCard.jsx
import React from "react";
import Stars from "./Stars";
import { starsFromViews } from "../utils/starsFromViews";

export default function ChannelCard({ channel, onClick }) {
  const title =
    channel?.title ||
    channel?.name ||
    channel?.channel_name ||
    "Canal sin nombre";

  const poster =
    channel?.poster_url ||
    channel?.poster ||
    channel?.thumbnail ||
    "/poster-fallback.jpg";

  const category =
    channel?.category || channel?.categoria || channel?.genre || "—";

  const country = channel?.country || channel?.pais || "—";

  const description =
    channel?.description || channel?.descripcion || channel?.about || "";

  // NUEVO: vistas → estrellas
  const views = Number(channel?.views_count || 0);
  const stars = starsFromViews(views);

  // Si ya tienes sección “Disponible en / Roku / Footer de redes”
  // no la toco. Solo agrego “Calificación” debajo del texto del canal.

  return (
    <button
      onClick={() => onClick?.(channel)}
      className="group w-full text-left rounded-xl overflow-hidden bg-gray-900/40 border border-gray-800 hover:border-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500/40 transition"
    >
      {/* Poster alto (vertical) */}
      <div className="relative">
        <div className="aspect-[3/4] md:aspect-[2/3] w-full overflow-hidden bg-gray-800">
          <img
            src={poster}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>

        {/* Etiqueta de categoría */}
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

        <div className="text-[12px] text-gray-400">
          {country}
        </div>

        {description ? (
          <p className="text-[12px] leading-4 text-gray-400 line-clamp-2 mt-1.5">
            {description}
          </p>
        ) : null}

        {/* NUEVO: Calificación por vistas */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[12px] font-semibold text-white/90">Calificación:</span>
          <Stars value={stars} />
          <span className="text-[11px] text-gray-400">({views} vistas)</span>
        </div>
      </div>
    </button>
  );
}
