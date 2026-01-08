// src/components/ChannelCard.jsx
import React from "react";

// Íconos SVG minimalistas (sin librerías externas)
const Icon = {
  facebook: (cls = "h-5 w-5") => (
    <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
      <path d="M22 12.07C22 6.48 17.52 2 11.93 2S2 6.48 2 12.07c0 5.02 3.66 9.19 8.44 9.93v-7.02H7.9v-2.9h2.54V9.41c0-2.5 1.49-3.88 3.77-3.88 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.62.77-1.62 1.56v1.87h2.76l-.44 2.9h-2.32v7.02C18.34 21.26 22 17.09 22 12.07z"/>
    </svg>
  ),
  instagram: (cls = "h-5 w-5") => (
    <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm5.25-.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5z"/>
    </svg>
  ),
  youtube: (cls = "h-5 w-5") => (
    <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
      <path d="M23.5 7.3s-.2-1.7-.8-2.4c-.8-.8-1.7-.8-2.1-.9C17.7 3.6 12 3.6 12 3.6h0s-5.7 0-8.6.4c-.4 0-1.3.1-2.1.9-.6.7-.8 2.4-.8 2.4S0 9.3 0 11.4v1.2c0 2.1.2 4.1.2 4.1s.2 1.7.8 2.4c.8.8 1.9.7 2.4.8 1.7.2 7.6.4 7.6.4s5.7 0 8.6-.4c.4 0 1.3-.1 2.1-.9.6-.7.8-2.4.8-2.4s.2-2 .2-4.1v-1.2c0-2.1-.2-4.1-.2-4.1zM9.6 14.9V8.7l6.2 3.1-6.2 3.1z"/>
    </svg>
  ),
  tiktok: (cls = "h-5 w-5") => (
    <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
      <path d="M21 8.4a7.3 7.3 0 0 1-4.6-1.6v7.1A6.1 6.1 0 1 1 10 7a6 6 0 0 1 1.7.3v3a3.3 3.3 0 1 0 2.8 3.2V2h2.3a4.9 4.9 0 0 0 4.2 4.6V8.4z"/>
    </svg>
  ),
  twitter: (cls = "h-5 w-5") => (
    <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
      <path d="M22.46 6c-.77.34-1.6.57-2.46.67a4.2 4.2 0 0 0 1.84-2.31 8.37 8.37 0 0 1-2.66 1.02 4.18 4.18 0 0 0-7.12 3.81A11.86 11.86 0 0 1 3.15 4.9 4.17 4.17 0 0 0 4.5 10a4.1 4.1 0 0 1-1.9-.52v.05a4.18 4.18 0 0 0 3.36 4.1c-.46.13-.95.2-1.45.08a4.19 4.19 0 0 0 3.9 2.9A8.38 8.38 0 0 1 2 19.54a11.83 11.83 0 0 0 6.41 1.88c7.69 0 11.9-6.37 11.9-11.9l-.01-.54A8.5 8.5 0 0 0 22.46 6z"/>
    </svg>
  ),
  link: (cls = "h-5 w-5") => (
    <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
      <path d="M3.9 12a4.9 4.9 0 0 1 4.9-4.9h3.2v2.4H8.8A2.5 2.5 0 1 0 8.8 14h3.2v2.4H8.8A4.9 4.9 0 0 1 3.9 12zm16.2 0a4.9 4.9 0 0 0-4.9-4.9h-3.2v2.4h3.2a2.5 2.5 0 1 1 0 5h-3.2V17h3.2a4.9 4.9 0 0 0 4.9-4.9z"/>
    </svg>
  ),
};

// Normaliza el URL (si guardaste sin protocolo)
const normalizeUrl = (u) => {
  if (!u) return "";
  try {
    const hasProto = /^https?:\/\//i.test(u);
    return hasProto ? u : `https://${u}`;
  } catch {
    return "";
  }
};

// Abre popup pequeño y centrado
const openPopup = (url) => {
  const href = normalizeUrl(url);
  if (!href) return;
  const w = 720;
  const h = 640;
  const y = window.top?.outerHeight
    ? Math.max(0, (window.top.outerHeight - h) / 2)
    : 100;
  const x = window.top?.outerWidth
    ? Math.max(0, (window.top.outerWidth - w) / 2)
    : 100;

  window.open(
    href,
    "_blank",
    `popup=yes,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${w},height=${h},top=${y},left=${x}`
  );
};

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

  // Roku (opcional)
  const rokuUrl = channel?.roku_url || channel?.roku || "";

  // Redes (opcional)
  const socials = [
    { key: "facebook", url: channel?.facebook, icon: Icon.facebook, label: "Facebook" },
    { key: "instagram", url: channel?.instagram, icon: Icon.instagram, label: "Instagram" },
    { key: "youtube", url: channel?.youtube, icon: Icon.youtube, label: "YouTube" },
    { key: "tiktok", url: channel?.tiktok, icon: Icon.tiktok, label: "TikTok" },
    { key: "twitter", url: channel?.twitter, icon: Icon.twitter, label: "Twitter/X" },
    { key: "website", url: channel?.website, icon: Icon.link, label: "Sitio web" },
  ].filter((s) => !!normalizeUrl(s.url));

  return (
    <div className="group w-full text-left rounded-xl overflow-hidden bg-gray-900/40 border border-gray-800 hover:border-gray-700 focus-within:ring-2 focus-within:ring-rose-500/40 transition">
      {/* Área clickeable para abrir el reproductor */}
      <button
        onClick={() => onClick?.(channel)}
        className="w-full text-left focus:outline-none"
      >
        {/* Poster alto (vertical) */}
        <div className="relative">
          {/* 3/4 en móviles, 2/3 desde md */}
          <div className="relative aspect-[3/4] md:aspect-[2/3] w-full overflow-hidden bg-gray-800">
            {/* La imagen se muestra completa y centrada */}
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

        {/* Texto + “Disponible en” */}
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

            {/* Disponible en (Roku) — solo si hay URL */}
            {rokuUrl && (
              <div className="shrink-0 text-right">
                <div className="text-[11px] text-gray-300 mb-1">
                  Disponible en:
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

      {/* Footer de redes sociales (no afecta la acción del poster) */}
      {socials.length > 0 && (
        <div className="px-3 pb-3">
          <div className="flex items-center justify-end gap-2">
            {socials.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); // no abrir el reproductor
                  openPopup(s.url);
                }}
                aria-label={s.label}
                title={s.label}
                className="p-2 rounded-md bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white border border-white/10 transition"
              >
                {s.icon("h-5 w-5")}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

