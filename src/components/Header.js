// src/components/Header.jsx
import React from "react";

export default function Header({
  searchTerm,
  onSearchChange,
  onFilterChange, // se mantiene por compatibilidad, aunque no mostramos botón
  filters,        // idem
}) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-black/40 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Logo / Marca */}
        <a href="/" className="flex items-center gap-2 shrink-0">
          <img
            src="https://uqzcnlmhmglzflkuzczk.supabase.co/storage/v1/object/public/avatars/logo_hispana_blanco.png"
            alt="Delsu TV"
            width={240}
            height={100}
            className="w-[240px] h-[100px] object-contain select-none"
            draggable="false"
          />
        </a>

        {/* Buscador */}
        <div className="flex-1 max-w-xl">
          <input
            type="text"
            placeholder="Buscar canales..."
            value={searchTerm}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          />
        </div>

        {/* (Quitado) Botón de Filtros y (Quitado) Iniciar sesión */}
        <div className="flex items-center gap-2">
          {/* Espacio reservado por si tienes otros iconos/acciones */}
        </div>
      </div>
    </header>
  );
}
