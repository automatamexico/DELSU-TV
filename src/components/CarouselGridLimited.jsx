import React, { useMemo } from "react";

/**
 * items:   array de tus canales (cualquier forma)
 * renderItem: (item) => JSX (tu card/PosterCanal)
 * maxRows: 10 por defecto
 * rowHeight: alto aproximado de cada fila (para que todo quede compacto)
 * cardWidth: ancho mínimo de cada card (para spacing consistente)
 * gap: separación horizontal entre cards
 * baseSpeed: segundos para que la pista recorra el 50% (se auto duplica para loop)
 */
export default function CarouselGridLimited({
  items = [],
  renderItem,
  maxRows = 10,
  rowHeight = 280,
  cardWidth = 240,
  gap = 16,
  baseSpeed = 40,
  className = "",
}) {
  // Dividimos el listado completo en hasta maxRows filas balanceadas
  const rows = useMemo(() => {
    if (!items.length) return [];
    const rowsCount = Math.min(maxRows, Math.max(1, Math.ceil(items.length / 1))); // al menos 1 fila
    // Calculamos cuántos elementos por fila (balanceado)
    const perRow = Math.ceil(items.length / rowsCount);
    const buckets = [];
    for (let i = 0; i < rowsCount; i++) {
      const start = i * perRow;
      const end = start + perRow;
      const slice = items.slice(start, end);
      if (slice.length) buckets.push(slice);
    }
    return buckets;
  }, [items, maxRows]);

  return (
    <div className={className}>
      {rows.map((rowItems, idx) => {
        const reverse = idx % 2 === 1;          // filas alternadas
        const speed = Math.max(20, baseSpeed);   // no dejes que sea demasiado lento

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
  // Dos copias de la misma pista para poder hacer loop continuo
  const doubled = useMemo(() => [...items, ...items], [items]);

  // Inline style para animación con duración configurable
  const animName = reverse ? "slide-right" : "slide-left";
  const animStyle = {
    animationName: animName,
    animationDuration: `${speed}s`,
  };

  return (
    <div
      className="relative overflow-hidden carousel-mask rounded-xl border border-gray-700/40 bg-gray-900/30"
      style={{ height: rowHeight, marginBottom: 16 }}
    >
      <div
        className="absolute inset-0 flex carousel-track"
        style={{
          ...animStyle,
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
        }}
      >
        {/* Pista 200% (duplicada) */}
        <div className="flex" style={{ gap, paddingInline: gap }}>
          {doubled.map((it, i) => (
            <div
              key={i}
              className="shrink-0"
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
