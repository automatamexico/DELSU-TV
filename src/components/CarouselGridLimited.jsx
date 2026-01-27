// src/components/CarouselGridLimited.jsx
import React, { useMemo } from "react";

/**
 * items:      array de canales
 * renderItem: (item) => JSX (tu ChannelCard)
 * maxRows:    cuántas filas como máximo (default 10)
 * cardWidth:  ancho fijo de cada tarjeta (debe ser >= al diseño de tu ChannelCard)
 * gap:        espacio horizontal entre tarjetas (px)
 * baseSpeed:  segundos de desplazamiento (menor = más rápido)
 */
export default function CarouselGridLimited({
  items = [],
  renderItem,
  maxRows = 10,
  cardWidth = 360,   // grande para que quepa poster + texto
  gap = 24,
  baseSpeed = 40,
  className = "",
}) {
  // dividimos el listado completo en hasta `maxRows` filas (balanceado)
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
        const reverse = idx % 2 === 1; // alterna dirección por fila
        const speed = Math.max(18, baseSpeed);

        return (
          <CarouselRow
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

function CarouselRow({ items, renderItem, reverse, speed, cardWidth, gap }) {
  // duplicamos el contenido para bucle infinito
  const doubled = useMemo(() => [...items, ...items], [items]);

  const animName = reverse ? "slide-right" : "slide-left";

  return (
    <div className="overflow-hidden rounded-xl border border-gray-700/40 bg-gray-900/30 mb-6">
      {/*
        IMPORTANTE:
        - Sin absolute.
        - Altura automática (depende del contenido).
        - No se pisa con la fila de abajo.
      */}
      <div
        className="whitespace-nowrap will-change-transform"
        style={{
          animationName: animName,
          animationDuration: `${speed}s`,
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
        }}
      >
        {/* pista duplicada */}
        {doubled.map((it, i) => (
          <div
            key={i}
            className="inline-block align-top"
            style={{
              width: cardWidth,
              marginRight: gap,
            }}
          >
            {renderItem(it)}
          </div>
        ))}
      </div>
    </div>
  );
}
