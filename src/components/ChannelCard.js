// src/components/ChannelCard.jsx
import React from "react";

/** Agrega un parámetro v=<vers> sólo si hay versión/fecha disponible */
function withBust(url, version) {
  if (!url) return url;
  if (!version) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(version)}`;
}

/** Abre un popup pequeño y evita que se dispare el onClick del card */
function openPopup(e, url) {
  if (!url) return;
  e.preventDefault();
  e.stopPropagation(); // ⬅️ clave para que no abra el reproductor
  const w = 720;
  const h = 600;
  const y = Math.max(0, Math.round((window.screen.height - h) / 2));
  const x = Math.max(0, Math.round((window.screen.width - w) / 2));
  window.open(
    url,
    "social_popup",
    `width=${w},height=${h},left=${x},top=${y},resizable=yes,scrollbars=yes,noopener`
  );
}

export default function ChannelCard({ channel, onClick }) {
  // Títulos / datos base
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

  // País (bandera)
  const banderaUrl = channel?.url_bandera || channel?.bandera_url || null;

  // Roku
  const rokuIconRaw =
    channel?.roku_icon_url ||
    channel?.roku_icon ||
    channel?.roku_logo_url ||
    channel?.roku_image_url ||
    null;

  const rokuLink =
    channel?.roku_link_url || channel?.roku_url || channel?.roku_link || null;

  // Footer redes
  const fbIcon = channel?.facebook_icon_url || channel?.facebook_icon || null;
  const fbUrl = channel?.facebook_url || null;

  const ytIcon =
    channel?.youtube_icon_url || channel?.youtube_icon || channel?.yt_icon;
  const ytUrl = channel?.youtube_url || channel?.yt_url || null;

  const tkIcon = channel?.tiktok_icon_url || channel?.tiktok_icon || null;
  const tkUrl = channel?.tiktok_url || null;

  const webIcon = channel?.website_icon_url || channel?.web_icon || null;
  const webUrl = channel?.website_url || channel?.web_url || null;

  // Versión para “bust” opcional
  const version =
    channel?.icon_version ||
    channel?.updated_at ||
    channel?.last_updated ||
    "";

  const rokuIcon = withBust(rokuIconRaw, version);
  const fbIconUrl = withBust(fbIcon, version);
  const ytIconUrl = withBust(ytIcon, version);
  const tkIconUrl = withBust(tkIcon, version);
  const webIconUrl = withBust(webIcon, version);
  const flagIconUrl = withBust(banderaUrl, version);

  const hasAnySocial = Boolean(fbUrl || ytUrl || tkUrl || webUrl);

  return (
    <button
      onClick={() => onClick?.(channel)}
      className="group w-full text-left rounded-xl overflow-hidden bg-gray-900/40 border border-gray-800 hover:border-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500/40 transition"
      type="button"
    >
      {/* Póster ajustado sin recortes */}
      <div className="relative">
        <div className="aspect-[3/4] md:aspect-[2/3] w-full overflow-hidden bg-gray-800">
          <img
            src={poster}
            alt={title}
            loading="lazy"
            className="w-full h-full object-contain object-center"
          />
        </div>

        {/* Etiqueta de categoría */}
        <div className="absolute left-2 top-2">
          <span className="text-[11px] px-2 py-1 rounded-full bg-rose-500/90 text-white shadow">
            {category}
          </span>
        </div>
      </div>

      {/* Zona inferior */}
      <div className="p-3">
        <div className="flex items-end justify-between gap-3">
          {/* Columna izquierda */}
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-white line-clamp-1">
              {title}
            </h3>

            <div className="mt-0.5 flex items-center gap-2 text-[12px] text-gray-300">
              {flagIconUrl ? (
                <img
                  src={flagIconUrl}
                  alt={country}
                  loading="lazy"
                  className="h-5 w-5 object-contain rounded-sm border border-white/10"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              ) : null}
              <span className="truncate">{country}</span>
            </div>

            {description ? (
              <p className="mt-1.5 text-[12px] leading-4 text-gray-400 line-clamp-2">
                {description}
              </p>
            ) : null}
          </div>

          {/* Columna derecha: Disponible en (Roku) */}
          {(rokuIcon || rokuLink) && (
            <div className="ml-auto shrink-0 text-right">
              <div className="text-[12px] font-medium text-gray-300 mb-1">
                Disponible en
              </div>

              {rokuIcon ? (
                rokuLink ? (
                  <a
                    href={rokuLink}
                    onClick={(e) => openPopup(e, rokuLink)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="inline-flex items-center"
                    aria-label="Abrir canal en Roku"
                  >
                    <img
                      src={rokuIcon}
                      alt="Roku"
                      loading="lazy"
                      className="h-5 w-auto object-contain"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  </a>
                ) : (
                  <img
                    src={rokuIcon}
                    alt="Roku"
                    loading="lazy"
                    className="h-5 w-auto object-contain"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                )
              ) : null}
            </div>
          )}
        </div>

        {/* Footer redes en popup */}
        {hasAnySocial && (
          <div className="mt-3">
            <div className="text-[12px] font-semibold text-gray-300">
              Síguenos en
            </div>
            <div className="mt-2 flex items-center gap-3">
              {fbUrl && fbIconUrl && (
                <a
                  href={fbUrl}
                  onClick={(e) => openPopup(e, fbUrl)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="inline-flex"
                  aria-label="Facebook"
                >
                  <img
                    src={fbIconUrl}
                    alt="Facebook"
                    loading="lazy"
                    className="h-5 w-5 object-contain"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </a>
              )}
              {ytUrl && ytIconUrl && (
                <a
                  href={ytUrl}
                  onClick={(e) => openPopup(e, ytUrl)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="inline-flex"
                  aria-label="YouTube"
                >
                  <img
                    src={ytIconUrl}
                    alt="YouTube"
                    loading="lazy"
                    className="h-5 w-5 object-contain"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </a>
              )}
              {tkUrl && tkIconUrl && (
                <a
                  href={tkUrl}
                  onClick={(e) => openPopup(e, tkUrl)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="inline-flex"
                  aria-label="TikTok"
                >
                  <img
                    src={tkIconUrl}
                    alt="TikTok"
                    loading="lazy"
                    className="h-5 w-5 object-contain"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </a>
              )}
              {webUrl && webIconUrl && (
                <a
                  href={webUrl}
                  onClick={(e) => openPopup(e, webUrl)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="inline-flex"
                  aria-label="Website"
                >
                  <img
                    src={webIconUrl}
                    alt="Website"
                    loading="lazy"
                    className="h-5 w-5 object-contain"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
