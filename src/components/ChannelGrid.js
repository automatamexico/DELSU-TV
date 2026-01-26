// src/components/ChannelGrid.jsx
import React, { useMemo } from "react";
import ChannelCard from "./ChannelCard";

/** Corta un arreglo en N trozos, en orden. */
function chunkIntoN(arr, n) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const chunks = [];
  const size = Math.ceil(arr.length / n);
  for (let i = 0; i < n; i++) {
    const s = i * size;
    const e = s + size;
    const slice = arr.slice(s, e);
    if (slice.length) chunks.push(slice);
  }
  return chunks;
}

function ChannelGridBase({ channels = [], onChannelClick }) {
  /**
   * Para conservar la “densidad” que tenías (≈4 columnas grandes en desktop),
   * derivamos un número de filas aproximando a 4 tarjetas por fila
   * y lo acotamos a un máximo de 10 filas.
   */
  const rows = useMemo(() => {
    if (!channels.length) return [];
    const approxPerRow = 4; // lo que tenías en lg:grid-cols-4
    const wantedRows = Math.ceil(channels.length / approxPerRow);
    const numRows = Math.min(10, Math.max(1, wantedRows));
    return chunkIntoN(channels, numRows);
  }, [channels]);

  if (!rows.length) {
    return (
      <div className="p-4 text-sm text-gray-400">
        No hay canales para mostrar.
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-6">
      {rows.map((row, idx) => {
        const invert = idx % 2 === 1; // filas 1,3,5... de derecha → izquierda

        return (
          <div key={`row-${idx}`} className="relative">
            {/* Scroll horizontal SIN recortar la altura de las tarjetas */}
            <div
              className="overflow-x-auto overflow-y-visible"
              style={{
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
              onWheel={(e) => {
                // desplazamiento horizontal con la rueda del ratón
                if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
                  e.currentTarget.scrollLeft += e.deltaY;
                  e.preventDefault();
                }
              }}
            >
              <style>{`
                /* Oculta la barra en navegadores WebKit (sin recortar contenido) */
                .hide-x-scroll::-webkit-scrollbar { display: none; }
              `}</style>

              <div
                className={`hide-x-scroll flex gap-4 ${
                  invert ? "flex-row-reverse" : ""
                }`}
              >
                {row.map((ch) => (
                  <div
                    key={ch.id || ch.slug || ch.title}
                    className="shrink-0 w-[min(92vw,24rem)] md:w-[24rem]"
                  >
                    {/* Tarjeta completa (póster + info) tal cual la tienes */}
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
