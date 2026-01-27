// src/components/CarouselGridLimited.jsx
import React, { useMemo, useRef, useState, useCallback } from "react";

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

/** Fila con marquee infinito + arrastre manual (mouse/touch) */
function RowCarousel({
  items,
  renderItem,
  reverse,
  speed,
  cardWidth,
  gap,
}) {
  const doubled = useMemo(() => [...items, ...items], [items]);

  // ---- Drag-to-scroll ----
  const scrollRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef({ x: 0, scrollLeft: 0 });

  const onPointerDown = useCallback((e) => {
  const el = scrollRef.current;
  if (!el) return;

  // ✅ Si el usuario está clickeando un elemento interactivo, NO capturamos el puntero
  // (deja que el <button> del ChannelCard reciba el click y abra el player)
  const interactive = e.target?.closest?.(
    "button, a, input, textarea, select, label, [role='button'], [data-no-drag='true']"
  );
  if (interactive) return;

  setDragging(true);
  el.setPointerCapture?.(e.pointerId);
  dragState.current.x = e.clientX;
  dragState.current.scrollLeft = el.scrollLeft;
}, []);

  const onPointerMove = useCallback((e) => {
    if (!dragging) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - dragState.current.x;
    el.scrollLeft = dragState.current.scrollLeft - dx;
  }, [dragging]);

  const endDrag = useCallback((e) => {
    if (!dragging) return;
    const el = scrollRef.current;
    setDragging(false);
    try { el?.releasePointerCapture?.(e.pointerId); } catch {}
  }, [dragging]);

  // soporte touch (por si el navegador no promueve pointer events)
  const onTouchStart = useCallback((e) => {
  const el = scrollRef.current;
  if (!el) return;

  const interactive = e.target?.closest?.(
    "button, a, input, textarea, select, label, [role='button'], [data-no-drag='true']"
  );
  if (interactive) return;

  setDragging(true);
  dragState.current.x = e.touches[0].clientX;
  dragState.current.scrollLeft = el.scrollLeft;
}, []);
  const onTouchEnd = useCallback(() => setDragging(false), []);

  // rueda -> desplazar horizontal
  const onWheel = useCallback((e) => {
    const el = scrollRef.current;
    if (!el) return;
    // Si hay scroll vertical en la rueda, conviértelo a horizontal
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, []);

  // animación continua (pausada mientras arrastras)
  const animName = reverse ? "slide-right" : "slide-left";
  const animStyle = {
    animationName: animName,
    animationDuration: `${speed}s`,
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    animationPlayState: dragging ? "paused" : "running",
    willChange: "transform",
  };

  return (
    // ahora es scrollable horizontalmente y NO recorta el contenido
    <div
      ref={scrollRef}
      className={`relative overflow-x-auto overflow-y-visible carousel-mask rounded-xl border border-gray-700/40 bg-gray-900/30 mb-4 ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{ scrollbarWidth: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      {/* escondemos la barra en navegadores WebKit */}
      <style>{`
        .carousel-mask::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Track animado (duplicado para loop). La animación se pausa al arrastrar */}
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
