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

  // Roku (icono + link) — mismas llaves de siempre
  const rokuIcon =
    channel?.roku_icon_url ||
    channel?.roku_icon ||
    channel?.roku_logo_url ||
    channel?.roku_image_url ||
    null;

  const rokuLink =
    channel?.roku_link_url ||
    channel?.roku_url ||
    channel?.roku_link ||
    null;

  return (
    <button
      onClick={() => onClick?.(channel)}
      className="group w-full text-left rounded-xl overflow-hidden bg-gray-900/40 border border-gray-800 hover:border-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500/40 transition"
    >
      {/* Poster alto (vertical) */}
      <div className="relative">
        {/* 3/4 en móviles, 2/3 desde md */}
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

        <div className="text-[12px] text-gray-400">{country}</div>

        {description ? (
          <p className="text-[12px] leading-4 text-gray-400 line-clamp-2 mt-1.5">
            {description}
          </p>
        ) : null}

        {/* Disponible en (Roku) */}
        {(rokuIcon || rokuLink) && (
          <div className="mt-2">
            <div className="text-[12px] font-medium text-gray-300 mb-1">
              También disponible en:
            </div>
            <div className="flex items-center gap-2">
              {rokuLink ? (
                <a
                  href={rokuLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center"
                  aria-label="Abrir en Roku"
                >
                  <img
                    src={rokuIcon}
                    alt="Roku"
                    loading="lazy"
                    className="h-7 w-auto object-contain" {/* ⬅️ Aumentado ~40% */}
                  />
                </a>
              ) : (
                rokuIcon && (
                  <img
                    src={rokuIcon}
                    alt="Roku"
                    loading="lazy"
                    className="h-7 w-auto object-contain" {/* ⬅️ Aumentado ~40% */}
                  />
                )
              )}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
