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
  // Aseguramos un array estable para no condicionar hooks
  const allItems = Array.isArray(items) ? items : [];
  const total = allItems.length;

  // Definimos cantidad de filas (constante) → nunca condiciona hooks
  const rowsCount = Math.max(1, Math.min(maxRows, 10));

  // Generamos filas: cada fila usa TODOS los items, pero rotados
  const rows = useMemo(() => {
    // Si no hay items, devolvemos filas vacías (mismo shape)
    if (total === 0) {
      return Array.from({ length: rowsCount }, () => []);
    }

    const rotate = (arr, k) => {
      if (!arr.length) return arr;
      const m = ((k % arr.length) + arr.length) % arr.length;
      return arr.slice(m).concat(arr.slice(0, m));
    };

    // offset aleatorio por fila (recalcula cuando cambian los items)
    return Array.from({ length: rowsCount }, () => {
      const off = Math.floor(Math.random() * total);
      return rotate(allItems, off);
    });
  }, [allItems, rowsCount, total]);

  // Ya llamamos hooks arriba; ahora sí podemos salir sin condicionar hooks
  if (total === 0) return null;

  return (
    <div className={className}>
      {rows.map((rowItems, idx) => {
        const reverse = idx % 2 === 1; // alterna dirección
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
