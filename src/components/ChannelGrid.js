// src/components/ChannelGrid.jsx
import React, { useMemo } from "react";
import ChannelCard from "./ChannelCard";

/**
 * Fila tipo "marquee": recorre TODOS los canales (no solo los de la fila),
 * duplicando el contenido para que el loop sea continuo.
 * direction: 'ltr' (izq→der) o 'rtl' (der→izq)
 */
function RowMarquee({ channels = [], onChannelClick, direction = "ltr", rowIndex = 0 }) {
  // Duración según número de items para que no “vuele” ni sea muy lento.
  const durationSec = useMemo(() => {
    const base = Math.max(30, channels.length * 2); // 30s mínimo
    // Pequeña variación por fila para que no vaya todo sincronizado.
    const jitter = (rowIndex % 3) * 2;
    return base + jitter;
  }, [channels.length, rowIndex]);

  // Clase de animación según dirección
  const animClass =
    direction === "rtl" ? "animate-marquee-rtl" : "animate-marquee-ltr";

  return (
    <div className="relative group overflow-hidden">
      {/* Keyframes + helpers */}
      <style>{`
        @keyframes marquee-ltr {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }
        @keyframes marquee-rtl {
          0%   { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-ltr {
          animation-name: marquee-ltr;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          animation-play-state: running;
        }
        .animate-marquee-rtl {
          animation-name: marquee-rtl;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          animation-play-state: running;
        }
        /* Pausa al pasar el mouse por la fila */
        .group:hover .animate-marquee-ltr,
        .group:hover .animate-marquee-rtl {
          animation-play-state: paused;
        }
        /* Evita que aparezca scrollbar horizontal */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Contenedor de pista (sin recortar alto de tarjetas) */}
      <div className="no-scrollbar overflow-x-hidden overflow-y-visible">
        {/* PISTA: contiene 2 copias de todos los canales para loop continuo */}
        <div
          className={`flex gap-4 ${animClass}`}
          style={{
            width: "200%",                   // 2 copias = 200%
            animationDuration: `${durationSec}s`,
          }}
        >
          {/* Copia A */}
          <div className="flex gap-4 w-1/2">
            {channels.map((ch) => (
              <div
                key={`A-${ch.id || ch.slug || ch.title}`}
                className="shrink-0 w-[min(92vw,24rem)] md:w-[24rem]"
              >
                <ChannelCard channel={ch} onClick={onChannelClick} />
              </div>
            ))}
          </div>

          {/* Copia B */}
          <div className="flex gap-4 w-1/2">
            {channels.map((ch) => (
              <div
                key={`B-${ch.id || ch.slug || ch.title}`}
                className="shrink-0 w-[min(92vw,24rem)] md:w-[24rem]"
              >
                <ChannelCard channel={ch} onClick={onChannelClick} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelGridBase({ channels = [], onChannelClick }) {
  // Número de filas: lo aproximamos a 4 tarjetas por fila como tenías
  // y lo acotamos a un máximo de 10 filas.
  const numRows = useMemo(() => {
    if (!channels.length) return 0;
    const approxPerRow = 4;
    const wanted = Math.ceil(channels.length / approxPerRow);
    return Math.min(10, Math.max(1, wanted));
  }, [channels.length]);

  if (!channels.length) {
    return (
      <div className="p-4 text-sm text-gray-400">No hay canales para mostrar.</div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-8">
      {Array.from({ length: numRows }).map((_, i) => (
        <RowMarquee
          key={`row-${i}`}
          channels={channels}
          onChannelClick={onChannelClick}
          direction={i % 2 === 0 ? "ltr" : "rtl"} // alterna por fila
          rowIndex={i}
        />
      ))}
    </div>
  );
}

export default React.memo(ChannelGridBase);
