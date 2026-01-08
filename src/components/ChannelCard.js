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

  // ROKU (ícono y link)
  const rokuIcon =
    channel?.roku_icon_url ||
    channel?.rokuIconUrl ||
    channel?.roku ||
    "";
  const rokuLink =
    channel?.roku_link_url ||
    channel?.rokuLinkUrl ||
    "";

  // Cache-busting base (póster y roku)
  const baseVersion =
    channel?.poster_version ||
    channel?.icon_version ||
    channel?.updated_at ||
    channel?.last_modified ||
    Date.now();

  const withBust = (url, ver) => {
    if (!url) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${encodeURIComponent(String(ver))}`;
  };

  const posterSrc = withBust(poster, baseVersion);
  const rokuIconSrc = withBust(rokuIcon, baseVersion);
  const hasRoku = Boolean(rokuIcon);

  // Redes sociales
  // >>> Ajuste: usamos un "version" específico para redes (si existe 'socials_version' o 'updated_at')
  // y además forzamos remonte del <img> cambiando su key cuando cambia la URL con bust.
  const socialsVersion =
    channel?.socials_version ||
    channel?.updated_at ||
    Date.now();

  const socialsRaw = [
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
  ];

  // Aplica bust SOLO a iconos de redes y prepara key única por cambio
  const socials = socialsRaw
    .filter((s) => s.url && s.icon)
    .map((s) => {
      const iconBusted = withBust(s.icon, socialsVersion);
      return { ...s, iconBusted, keyRender: `${s.key}-${iconBusted}` };
    });

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
      {/* Poster vertical, sin deformar */}
      <div className="relative">
        <div className="relative w-full aspect-[3/4] overflow-hidden bg-gray-800">
          <img
            key={posterSrc}
            src={posterSrc}
            alt={title}
            loading="lazy"
            draggable={false}
            className="absolute inset-0 w-full h-full object-contain object-center p-1 block"
          />
        </div>

        {/* Etiqueta de categoría */}
        <div className="absolute left-2 top-2">
          <span className="text-[11px] px-2 py-1 rounded-full bg-rose-500/90 text-white shadow">
            {category}
          </span>
        </div>
      </div>

      {/* Texto + Roku + Redes */}
      <div className="p-3 space-y-2">
        {/* Título / País + Roku */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-white line-clamp-1">
              {title}
            </h3>
            <div className="text-[12px] text-gray-400">{country}</div>
          </div>

          {hasRoku && (
            <div className="shrink-0 text-right">
              <div className="text-[10px] text-gray-400 mb-1">
                Disponible también en:
              </div>
              <div className="flex justify-end">
                <img
                  key={rokuIconSrc}
                  src={rokuIconSrc}
                  alt="Roku"
                  title="Roku"
                  className="h-7 w-auto object-contain rounded-md bg-gray-800/60 p-[2px] cursor-pointer hover:bg-gray-700/60 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (rokuLink) openPopup(rokuLink);
                  }}
                  draggable={false}
                />
              </div>
            </div>
          )}
        </div>

        {/* Descripción */}
        {description ? (
          <p className="text-[12px] leading-4 text-gray-400 line-clamp-2">
            {description}
          </p>
        ) : null}

        {/* Footer redes: “Síguenos en” + iconos (con bust y key para remonte) */}
        {socials.length > 0 && (
          <div className="pt-1">
            <div className="text-[12px] font-semibold text-gray-200 mb-1">
              Síguenos en
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {socials.map((s) => (
                <img
                  key={s.keyRender}
                  src={s.iconBusted}
                  alt={s.label}
                  title={s.label}
                  className="h-6 w-6 object-contain rounded-md bg-gray-800/60 p-[2px] hover:bg-gray-700/70 transition cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    openPopup(s.url);
                  }}
                  draggable={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
