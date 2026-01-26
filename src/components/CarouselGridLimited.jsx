// src/components/CarouselGridLimited.jsx
import React, { useMemo } from "react";

/**
 * items:      array de canales
 * renderItem: (item) => <ChannelCard .../>
 * maxRows:    número máximo de filas (default 10)
 * cardWidth:  ancho fijo de cada tarjeta (debe coincidir con el ancho visual de tu card)
 * gap:        separación horizontal entre tarjetas
 * baseSpeed:  segundos en recorrer media pista (la pista está duplicada)
 */
export default function CarouselGridLimited({
  items = [],
  renderItem,
  maxRows = 10,
  cardWidth = 360,   // <-- subí el valor para tu card grande (ajústalo si tu card es más ancha o más angosta)
  gap = 24,          // un poco más de aire entre tarjetas
  baseSpeed = 40,
  className = "",
}) {
  const rows = useMemo(() => {
    if (!items.length) return [];
    const rowsCount = Math.min(maxRows, Math.max(1, Math.ceil(items.length / 1)));
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
        const reverse = idx % 2 === 1;
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

function RowCarousel({ items, renderItem, reverse, speed, cardWidth, gap }) {
  // pista duplicada para loop infinito
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
      className="carousel-mask rounded-xl border border-gray-700/40 bg-gray-900/30 mb-8"
      /* SIN height fija: la altura viene de las tarjetas */
    >
      {/* Pista en flujo normal, NO absoluta */}
      <div className="carousel-track flex items-stretch" style={animStyle}>
        {/* Duplicado para 200% */}
        <div className="flex items-stretch" style={{ gap, paddingInline: gap }}>
          {doubled.map((it, i) => (
            <div
              key={i}
              className="carousel-slot"
              style={{
                flex: `0 0 ${cardWidth}px`,  // no se encoge ni crece
                width: cardWidth,            // asegura ancho fijo
              }}
            >
              {renderItem(it)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
