// src/components/ChannelCard.jsx
import React from "react";

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

  // URL del logo Roku desde la tabla ( si no hay, no se muestra)
  const rokuUrl = channel?.roku_url || channel?.roku || "";

  return (
    <button
      onClick={() => onClick?.(channel)}
      className="group w-full text-left rounded-xl overflow-hidden bg-gray-900/40 border border-gray-800 hover:border-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500/40 transition"
    >
      {/* Poster alto (vertical) */}
      <div className="relative">
        {/* 3/4 en móviles, 2/3 desde md */}
        <div className="relative aspect-[3/4] md:aspect-[2/3] w-full overflow-hidden bg-gray-800">
          {/* Contenedor centrado: asegura que la imagen se vea completa */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={poster}
              alt={title}
              loading="lazy"
              className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
        </div>

        {/* Etiqueta de categoría */}
        <div className="absolute left-2 top-2">
          <span className="text-[11px] px-2 py-1 rounded-full bg-rose-500/90 text-white shadow">
            {category}
          </span>
        </div>
      </div>

      {/* Texto + “Tambien disponible en” */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Bloque de textos */}
          <div className="min-w-0 flex-1 space-y-1.5">
            <h3 className="text-[15px] font-semibold text-white line-clamp-1">
              {title}
            </h3>

            <div className="text-[12px] text-gray-400">{country}</div>

            {description ? (
              <p className="text-[12px] leading-4 text-gray-400 line-clamp-2">
                {description}
              </p>
            ) : null}
          </div>

          {/* Disponible en (Roku) — se muestra solo si hay URL */}
          {rokuUrl && (
            <div className="shrink-0 text-right">
              <div className="text-[11px] text-gray-300 mb-1">
                Tambien disponible en:
              </div>

              {/* Contenedor con proporción 64:29 (640x290) y tamaño responsivo */}
              <div className="inline-flex items-center justify-center rounded-md border border-white/10 bg-black/20 p-1">
                <div className="relative w-24 md:w-28 aspect-[64/29]">
                  <img
                    src={rokuUrl}
                    alt="Roku"
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
