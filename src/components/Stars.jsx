// src/components/Stars.jsx
import React from "react";

export default function Stars({ value = 0, size = 14 }) {
  const full = Math.max(0, Math.min(5, Math.floor(value)));
  const empty = 5 - full;

  return (
    <div className="inline-flex items-center gap-[2px]" title={`${value} / 5`}>
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f${i}`} style={{ fontSize: size, lineHeight: 1, color: "#fff" }}>★</span>
      ))}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`} style={{ fontSize: size, lineHeight: 1, color: "#666" }}>☆</span>
      ))}
    </div>
  );
}
