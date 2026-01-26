// src/components/ChannelGrid.jsx
import React, { useMemo } from "react";
import ChannelCard from "./ChannelCard";

/**
 * Divide un arreglo en N chunks (lo más parejos posible)
 */
function chunkIntoN(arr, n) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const chunks = [];
  const size = Math.ceil(arr.length / n);
  for (let i = 0; i < n; i++) {
    const start = i * size;
    const end = start + size;
    const slice = arr.slice(start, end);
    if (slice.length) chunks.push(slice);
  }
  return chunks;
}

function ChannelGridBase({ channels = [], onChannelClick }) {
  // Hasta 10 filas como máximo
  const rows = useMemo(() => {
    const MAX_ROWS = 10;
    const n = Math.min(MAX_ROWS, Math.max(1, Math.ceil(channels.length / 1)));
    return chunkIntoN(channels, n);
  }, [channels]);

  if (!channels?.length) {
    return (
      <div className="p-4 text-sm text-gray-400">
        No hay canales para mostrar.
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-6">
      {rows.map((row, idx) => {
        const invert = idx % 2 === 1; // filas impares invertidas (derecha→izquierda)
        return (
          <div key={`row-${idx}`} className="relative">
            {/* Contenedor de scroll horizontal SIN recortar altura */}
            <div
              className="overflow-x-auto overflow-y-visible"
              style={{
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
              // Oculta scrollbar en navegadores WebKit
              onWheel={(e) => {
                // Permite desplazamiento horizontal con rueda en desktops
                if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
                  e.currentTarget.scrollLeft += e.deltaY;
                  e.preventDefault();
                }
              }}
            >
              <style>{`
                /* Ocultar scrollbar en webkit sin recortar contenido */
                .hide-scrollbar::-webkit-scrollbar { display: none; }
              `}</style>

              <div
                className={`hide-scrollbar flex gap-4 ${
                  invert ? "flex-row-reverse" : ""
                }`}
              >
                {row.map((ch) => (
                  <div
                    key={ch.id || ch.slug || ch.title}
                    className="shrink-0 w-[min(92vw,24rem)]"
                  >
                    <ChannelCard channel={ch} onClick={onChannelClick} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(ChannelGridBase);
