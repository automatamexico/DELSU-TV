// src/components/ChannelCard.jsx
import React from "react";

/** Normaliza la URL con https:// si falta */
function normalizeUrl(url) {
  if (!url) return "";
  const u = String(url).trim();
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

/** Bust de caché opcional para íconos si usas versión/updated_at en DB */
function withBust(url, version) {
  if (!url) return url;
  if (!version) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(version)}`;
}

/** Abre popup centrado (SIN abrir pestaña nueva si es bloqueado) */
function openPopupControlled(e, rawUrl) {
  e?.preventDefault?.();
  e?.stopPropagation?.();

  const url = normalizeUrl(rawUrl);
  if (!url) return;

  const w = 720;
  const h = 600;
  const y = Math.max(0, Math.round((window.screen.height - h) / 2));
  const x = Math.max(0, Math.round((window.screen.width - w) / 2));
  const feat = `width=${w},height=${h},left=${x},top=${y},resizable=yes,scrollbars=yes,noopener`;

  // Solo intento de popup; si es bloqueado, NO hay fallback a nueva pestaña
  window.open(url, "social_popup", feat);
}

export default function ChannelCard({ channel, onClick }) {
  // Básicos
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

  // Bandera
  const banderaUrl = channel?.url_bandera || channel?.bandera_url || null;

  // Roku (ícono y link)
  const rokuIconRaw =
    channel?.roku_icon_url ||
    channel?.roku_icon ||
    channel?.roku_logo_url ||
    channel?.roku_image_url ||
    channel?.roku ||
    null;

  const rokuLink =
    channel?.roku_link_url || channel?.roku_url || channel?.roku_link || null;

  // Redes (ícono + url)
  const fbIcon = channel?.facebook_icon_url || channel?.facebook_icon || null;
  const fbUrl = channel?.facebook_url || null;

  const ytIcon =
    channel?.youtube_icon_url || channel?.youtube_icon || channel?.yt_icon;
  const ytUrl = channel?.youtube_url || channel?.yt_url || null;

  const tkIcon = channel?.tiktok_icon_url || channel?.tiktok_icon || null;
  const tkUrl = channel?.tiktok_url || null;

  const webIcon = channel?.website_icon_url || channel?.web_icon || null;
  const webUrl = channel?.website_url || channel?.web_url || null;

  // Versión para bust cache (si tienes ese campo en DB)
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
    <div className="group w-full text-left rounded-xl overflow-hidden bg-gray-900/40 border border-gray-800 hover:border-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500/40 transition">
      {/* === PÓSTER (ÚNICO QUE ABRE EL REPRODUCTOR) === */}
      <button
        type="button"
        onClick={() => onClick?.(channel)}
        className="relative block w-full text-left"
        aria-label={`Abrir reproductor: ${title}`}
      >
        <div className="aspect-[3/4] md:aspect-[2/3] w-full overflow-hidden bg-gray-800">
          <img
            src={poster}
            alt={title}
            loading="lazy"
            className="w-full h-full object-contain object-center transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>

        {/* Etiqueta categoría en el póster */}
        <div className="absolute left-2 top-2">
          <span className="text-[11px] px-2 py-1 rounded-full bg-rose-500/90 text-white shadow">
            {category}
          </span>
        </div>
      </button>

      {/* === CUERPO (NO ABRE REPRODUCTOR) === */}
      <div className="p-3">
        <div className="flex items-end justify-between gap-3">
          {/* Izquierda: título, país, descripción */}
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

          {/* Derecha: Roku (click → popup) */}
          {(rokuIcon || rokuLink) && (
            <div className="ml-auto shrink-0 text-right">
              <div className="text-[12px] font-medium text-gray-300 mb-1">
                También disponible en
              </div>

              {rokuIcon ? (
                rokuLink ? (
                  <button
                    type="button"
                    onClick={(e) => openPopupControlled(e, rokuLink)}
                    className="inline-flex items-center"
                    aria-label="Abrir Roku"
                    title="Abrir Roku"
                  >
                    <img
                      src={rokuIcon}
                      alt="Roku"
                      loading="lazy"
                      className="h-5 w-auto object-contain"
                    />
                  </button>
                ) : (
                  <img
                    src={rokuIcon}
                    alt="Roku"
                    loading="lazy"
                    className="h-5 w-auto object-contain"
                  />
                )
              ) : null}
            </div>
          )}
        </div>

        {/* Footer redes (click → popup) */}
        {hasAnySocial && (
          <div className="mt-3">
            <div className="text-[12px] font-semibold text-gray-300">
              Síguenos en
            </div>
            <div className="mt-2 flex items-center gap-3">
              {fbUrl && fbIconUrl && (
                <button
                  type="button"
                  onClick={(e) => openPopupControlled(e, fbUrl)}
                  className="inline-flex"
                  aria-label="Facebook"
                  title="Facebook"
                >
                  <img
                    src={fbIconUrl}
                    alt="Facebook"
                    loading="lazy"
                    className="h-5 w-5 object-contain"
                  />
                </button>
              )}
              {ytUrl && ytIconUrl && (
                <button
                  type="button"
                  onClick={(e) => openPopupControlled(e, ytUrl)}
                  className="inline-flex"
                  aria-label="YouTube"
                  title="YouTube"
                >
                  <img
                    src={ytIconUrl}
                    alt="YouTube"
                    loading="lazy"
                    className="h-5 w-5 object-contain"
                  />
                </button>
              )}
              {tkUrl && tkIconUrl && (
                <button
                  type="button"
                  onClick={(e) => openPopupControlled(e, tkUrl)}
                  className="inline-flex"
                  aria-label="TikTok"
                  title="TikTok"
                >
                  <img
                    src={tkIconUrl}
                    alt="TikTok"
                    loading="lazy"
                    className="h-5 w-5 object-contain"
                  />
                </button>
              )}
              {webUrl && webIconUrl && (
                <button
                  type="button"
                  onClick={(e) => openPopupControlled(e, webUrl)}
                  className="inline-flex"
                  aria-label="Sitio web"
                  title="Sitio web"
                >
                  <img
                    src={webIconUrl}
                    alt="Sitio web"
                    loading="lazy"
                    className="h-5 w-5 object-contain"
                  />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
