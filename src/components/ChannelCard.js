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

  // --- NUEVO: redes sociales (acepta snake_case y camelCase) ---
  const socials = [
    {
      key: "facebook",
      url: channel?.facebook_url || channel?.facebookUrl,
      icon: channel?.facebook_icon_url || channel?.facebookIconUrl,
      label: "Facebook",
    },
    {
      key: "youtube",
      url: channel?.youtube_url || channel?.youtubeUrl,
      icon: channel?.youtube_icon_url || channel?.youtubeIconUrl,
      label: "YouTube",
    },
    {
      key: "tiktok",
      url: channel?.tiktok_url || channel?.tiktokUrl,
      icon: channel?.tiktok_icon_url || channel?.tiktokIconUrl,
      label: "TikTok",
    },
    {
      key: "website",
      url: channel?.website_url || channel?.websiteUrl,
      icon: channel?.website_icon_url || channel?.websiteIconUrl,
      label: "Sitio",
    },
  ].filter(s => s.url && s.icon); // solo las que tengan ambos

  const openPopup = (href) => {
    if (!href) return;
    const w = 520, h = 720;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    window.open(
      href,
      "channel-social",
      `width=${w},height=${h},left=${left},top=${top},noopener,noreferrer`
    );
  };

  return (
    <button
      onClick={() => onClick?.(channel)}
      className="group w-full text-left rounded-xl overflow-hidden bg-gray-900/40 border border-gray-800 hover:border-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500/40 transition"
    >
      {/* Poster alto (vertical) */}
      <div className="relative">
        {/* NO tocamos proporción: 3/4 en móviles, 2/3 en md+ */}
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

      {/* Texto + footer */}
      <div className="p-3 space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-white line-clamp-1">
              {title}
            </h3>
            <div className="text-[12px] text-gray-400">{country}</div>
          </div>

          {/* NUEVO: bloque “Disponible en” con íconos si existen */}
          {socials.length > 0 && (
            <div className="shrink-0 text-right">
              <div className="text-[10px] text-gray-400 mb-1">
                Disponible También en:
              </div>
              <div className="flex items-center gap-2 justify-end">
                {socials.map((s) => (
                  <img
                    key={s.key}
                    src={s.icon}
                    alt={s.label}
                    title={s.label}
                    className="h-6 w-6 object-contain rounded-md bg-gray-800/60 p-[2px] hover:bg-gray-700/70 transition"
                    onClick={(e) => {
                      e.stopPropagation(); // no abrir el modal del canal
                      openPopup(s.url);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {description ? (
          <p className="text-[12px] leading-4 text-gray-400 line-clamp-2 mt-1.5">
            {description}
          </p>
        ) : null}
      </div>
    </button>
  );
}
