import React, { useMemo } from "react";

/**
 * items        : array completo de canales (pasas TODO el listado)
 * renderItem   : (item) => JSX (tu ChannelCard)
 * maxRows      : máximo de filas que quieres mostrar (10 por defecto)
 * rowHeight    : alto de cada fila (DEBE alcanzar la card completa)
 * cardWidth    : ancho fijo por tarjeta dentro del carrusel
 * gap          : separación horizontal entre tarjetas
 * baseSpeed    : segundos por bucle (cuanto menor, más rápido)
 * className    : clases extra para el contenedor
 *
 * NOTA CLAVE: si ves recortes/choques, sube rowHeight; si se ven muy
 * apretadas, cambia cardWidth (360–400 suele ir bien para tus cards).
 */
export default function CarouselGridLimited({
  items = [],
  renderItem,
  maxRows = 10,
  rowHeight = 560,   // <-- alto para tu tarjeta completa (poster + texto)
  cardWidth = 360,   // <-- ancho “slot” coherente con tu card grande
  gap = 16,
  baseSpeed = 40,    // segundos por vuelta; 30–45 suele verse bien
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
        const reverse = idx % 2 === 1;   // alterna dirección por fila
        return (
          <RowCarousel
            key={`row-${idx}`}
            items={rowItems}
            renderItem={renderItem}
            reverse={reverse}
            speed={Math.max(10, baseSpeed)}
            rowHeight={rowHeight}
            cardWidth={cardWidth}
            gap={gap}
          />
        );
      })}
    </div>
  );
}

/** Fila con marquee infinito (duplicada para loop continuo) */
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

  return (
    <div
      className="relative overflow-hidden carousel-mask rounded-xl border border-gray-700/40 bg-gray-900/30"
      style={{ height: rowHeight, marginBottom: 16 }}
    >
      <div
        className="absolute inset-0 flex items-stretch will-change-transform"
        style={{
          animationName: animName,
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
          animationDuration: `${speed}s`,
        }}
      >
        {/* Pista duplicada (200%) */}
        <div className="flex items-stretch" style={{ gap, paddingInline: gap }}>
          {doubled.map((it, i) => (
            <div
              key={i}
              className="flex-none"
              style={{ width: cardWidth }}  // ancho fijo por tarjeta
            >
              {/* Tu card se monta tal cual (completa) */}
              {renderItem(it)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
