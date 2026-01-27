// src/components/CarouselGridLimited.jsx
import React, { useMemo } from "react";

/**
 * items:      arreglo completo de canales
 * renderItem: (item) => JSX (tu <ChannelCard />)
 * maxRows:    cuántas filas quieres (cada fila recorre TODOS los canales)
 * cardWidth:  ancho mínimo reservado para cada card
 * gap:        separación horizontal entre cards
 * baseSpeed:  velocidad base del scroll continuo (segundos)
 */
export default function CarouselGridLimited({
  items = [],
  renderItem,
  maxRows = 10,
  cardWidth = 360,
  gap = 24,
  baseSpeed = 40,
  className = "",
}) {
  const allItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const total = allItems.length;

  const rowsCount = useMemo(
    () => Math.max(1, Math.min(maxRows, 10)),
    [maxRows]
  );

  // Cada fila muestra TODOS los items con un offset aleatorio distinto
  const rows = useMemo(() => {
    const rotate = (arr, k) => {
      if (!arr.length) return arr;
      const m = ((k % arr.length) + arr.length) % arr.length;
      return arr.slice(m).concat(arr.slice(0, m));
    };

    if (total === 0) {
      return Array.from({ length: rowsCount }, () => []);
    }

    return Array.from({ length: rowsCount }, () => {
      const off = Math.floor(Math.random() * total);
      return rotate(allItems, off);
    });
  }, [allItems, rowsCount, total]);

  if (total === 0) return null;

  return (
    <div className={className}>
      {rows.map((rowItems, idx) => {
        const reverse = idx % 2 === 1; // alterna dirección por fila
        const speed = Math.max(20, baseSpeed);
        return (
          <RowCarousel
            key={`row-${idx}`}
            items={rowItems}
            renderItem={renderItem}
            reverse={reverse}
            speed={speed}
            cardWidth={cardWidth}
            gap={gap}
          />
        );
      })}
    </div>
  );
}

/** Fila con marquee infinito (duplica contenido para loop continuo) */
function RowCarousel({
  items,
  renderItem,
  reverse,
  speed,
  cardWidth,
  gap,
}) {
  const doubled = useMemo(() => [...items, ...items], [items]);
  const animName = reverse ? "slide-right" : "slide-left";
  const animStyle = {
    animationName: animName,
    animationDuration: `${speed}s`,
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    willChange: "transform",
  };

  return (
    // SIN altura fija: usa la altura natural de tus ChannelCard (póster + info)
    <div
      className="relative overflow-hidden carousel-mask rounded-xl border border-gray-700/40 bg-gray-900/30 mb-4"
    >
      {/* SIN absolute/inset: el contenedor crece según el contenido */}
      <div className="flex carousel-track" style={animStyle}>
        <div className="flex" style={{ gap, paddingInline: gap }}>
          {doubled.map((it, i) => (
            <div
              key={i}
              className="carousel-slot shrink-0"
              style={{ width: cardWidth }}
            >
              {renderItem(it)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
