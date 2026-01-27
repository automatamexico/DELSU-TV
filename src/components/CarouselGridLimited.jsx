// src/components/CarouselGridLimited.jsx
import React, { useMemo } from "react";

/**
 * items:      array de canales
 * renderItem: (item) => <ChannelCard .../>
 * maxRows:    número máximo de filas (default 10)
 * cardWidth:  ancho fijo de cada tarjeta (debe coincidir con el ancho visual de tu card)
 * gap:        separación horizontal entre tarjetas
 * baseSpeed:  segundos del marquee (más alto = más lento)
 */
export default function CarouselGridLimited({
  items = [],
  renderItem,
  maxRows = 10,
  cardWidth = 360,  // ajusta a tu ancho real de card
  gap = 24,
  baseSpeed = 40,
  className = "",
}) {
  const rows = useMemo(() => {
    if (!items.length) return [];
    // balanceo simple en hasta maxRows filas:
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
        const speed = Math.max(16, baseSpeed);
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
  // pista duplicada para loop continuo
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
    <div className="carousel-mask rounded-xl border border-gray-700/40 bg-gray-900/30 mb-8 overflow-hidden">
      {/* Pista en flujo normal (NO absolute), marquee por transform */}
      <div className="carousel-strip" style={animStyle}>
        {doubled.map((it, i) => (
          <span
            key={i}
            className="carousel-slot inline-block align-top"
            style={{
              width: cardWidth,
              marginRight: gap,
              // el slot define el ancho: el hijo no puede excederlo
            }}
          >
            <div className="h-full w-full carousel-card-wrap">
              {renderItem(it)}
            </div>
          </span>
        ))}
      </div>
    </div>
  );
}
