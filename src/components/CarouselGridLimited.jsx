// src/components/CarouselGridLimited.jsx
import React, { useMemo } from "react";

/**
 * items:      arreglo completo de canales
 * renderItem: (item) => JSX (tu <ChannelCard />)
 * maxRows:    cuántas filas quieres (cada fila recorre TODOS los canales)
 * rowHeight:  alto visual de cada fila (contenedor del carrusel)
 * cardWidth:  ancho mínimo reservado para cada card
 * gap:        separación horizontal entre cards
 * baseSpeed:  velocidad base del scroll continuo (segundos)
 */
export default function CarouselGridLimited({
  items = [],
  renderItem,
  maxRows = 10,
  rowHeight = 320,
  cardWidth = 360,
  gap = 24,
  baseSpeed = 40,
  className = "",
}) {
  // Si no hay items, no renderizamos
  if (!items?.length) return null;

  // Número de filas a renderizar (hasta maxRows)
  const rowsCount = Math.max(1, Math.min(maxRows, 10));

  // Para que **cada fila recorra TODOS los items** pero empiece en un punto distinto,
  // generamos un "offset" aleatorio por fila y ROTAMOS el array.
  const rows = useMemo(() => {
    // pequeña función de rotación
    const rotate = (arr, k) => {
      if (!arr.length) return arr;
      const m = ((k % arr.length) + arr.length) % arr.length;
      return arr.slice(m).concat(arr.slice(0, m));
    };

    // un offset aleatorio para cada fila (recalcula si cambia la lista)
    const offsets = Array.from({ length: rowsCount }, () =>
      Math.floor(Math.random() * items.length)
    );

    // para cada fila devolvemos TODOS los items, pero rotados con su offset
    return offsets.map((off) => rotate(items, off));
  }, [items, rowsCount]);

  return (
    <div className={className}>
      {rows.map((rowItems, idx) => {
        const reverse = idx % 2 === 1;      // alternamos dirección
        const speed = Math.max(20, baseSpeed);
        return (
          <RowCarousel
            key={`row-${idx}`}
            items={rowItems}
            renderItem={renderItem}
            reverse={reverse}
            speed={speed}
            rowHeight={rowHeight}
            cardWidth={cardWidth}
            gap={gap}
          />
        );
      })}
    </div>
  );
}

/** Fila individual con marquee infinito (duplica contenido para loop) */
function RowCarousel({
  items,
  renderItem,
  reverse,
  speed,
  rowHeight,
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
  };

  return (
    <div
      className="relative overflow-hidden carousel-mask rounded-xl border border-gray-700/40 bg-gray-900/30"
      style={{ height: rowHeight, marginBottom: 16 }}
    >
      <div className="absolute inset-0 flex carousel-track" style={animStyle}>
        <div className="flex" style={{ gap, paddingInline: gap }}>
          {doubled.map((it, i) => (
            <div key={i} className="carousel-slot shrink-0" style={{ width: cardWidth }}>
              {renderItem(it)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
