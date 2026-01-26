// src/components/ChannelGrid.jsx
import React, { useEffect, useMemo, useRef } from "react";
import ChannelCard from "./ChannelCard";

/**
 * Reparte los canales en N filas (hasta 10). No duplica ni corta tarjetas.
 * Se hace por round-robin para que todas las filas queden balanceadas.
 */
function splitInRows(items, maxRows = 10) {
  const rows = Array.from({ length: Math.min(maxRows, Math.max(1, Math.ceil(items.length / 1))) }, () => []);
  items.forEach((it, idx) => {
    rows[idx % rows.length].push(it);
  });
  return rows;
}

/**
 * Carrusel horizontal por fila con auto-scroll suave.
 * - No fija alturas (usa el alto natural de ChannelCard).
 * - Cada item es flex-none y tiene ancho mínimo adecuado para que quepa la tarjeta completa.
 * - Alterna dirección por fila.
 */
function CarouselRow({ items, onChannelClick, reverse = false, rowIndex }) {
  const scrollerRef = useRef(null);
  const timerRef = useRef(null);

  // Ajustes de auto-scroll
  const STEP_PX = 2;      // píxeles por tick (más grande = más rápido)
  const TICK_MS = 20;     // cada cuántos ms avanza
  const PAUSE_MS = 2200;  // pausa al llegar a un extremo

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    let dir = reverse ? -1 : 1;
    let rafId;
    let lastTick = 0;
    let tickAccum = 0;

    const tick = (now) => {
      rafId = requestAnimationFrame(tick);

      if (!lastTick) {
        lastTick = now;
        return;
      }
      const delta = now - lastTick;
      lastTick = now;

      tickAccum += delta;
      if (tickAccum < TICK_MS) return;
      tickAccum = 0;

      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;

      const next = el.scrollLeft + dir * STEP_PX;

      // Rebotar y pausar al llegar a los extremos
      if (next <= 0) {
        el.scrollLeft = 0;
        dir = 1;
        if (!timerRef.current) {
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
          }, PAUSE_MS);
        }
        return;
      }
      if (next >= maxScroll) {
        el.scrollLeft = maxScroll;
        dir = -1;
        if (!timerRef.current) {
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
          }, PAUSE_MS);
        }
        return;
      }

      // Avance normal
      el.scrollLeft = next;
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [reverse, rowIndex]);

  return (
    <div className="relative px-4">
      <div
        ref={scrollerRef}
        className="overflow-x-auto overflow-y-visible no-scrollbar"
        style={{
          // El contenedor solo hace scroll horizontal; altura la manda el contenido (la tarjeta)
          scrollBehavior: "smooth",
        }}
      >
        <div
          className={`flex gap-4 py-4 ${reverse ? "flex-row-reverse" : "flex-row"}`}
          // No fijamos alturas: que ChannelCard respete su layout completo
        >
          {items.map((ch) => (
            <div
              key={ch.id || ch.slug || ch.title}
              className="
                flex-none
                w-[85vw] sm:w-[360px] lg:w-[380px] xl:w-[400px]
              "
            >
              <ChannelCard channel={ch} onClick={onChannelClick} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChannelGridCarousel({ channels, onChannelClick }) {
  const rows = useMemo(() => splitInRows(channels || [], 10), [channels]);

  if (!rows.length) {
    return <div className="p-4 text-sm text-gray-400">Sin canales para mostrar.</div>;
  }

  return (
    <div className="space-y-6">
      {rows.map((row, i) =>
        row.length ? (
          <CarouselRow
            key={`row-${i}`}
            items={row}
            onChannelClick={onChannelClick}
            reverse={i % 2 === 1}   // impar a la izquierda, par a la derecha
            rowIndex={i}
          />
        ) : null
      )}
    </div>
  );
}

export default React.memo(ChannelGridCarousel);
