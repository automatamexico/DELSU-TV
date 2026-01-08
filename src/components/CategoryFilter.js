// src/components/CategoryFilter.jsx
import React, { useMemo, useState, useRef, useEffect } from "react";

export default function CategoryFilter({
  categories = [],
  selectedCategory,
  onCategoryChange,
  // País
  selectedCountry,
  onCountryChange,
  countryItems = [], // [{ country, flagUrl }]
}) {
  // Asegurar que “Entretenimiento” exista sin depender del archivo de data
  const shownCategories = useMemo(() => {
    const set = new Set((categories || []).map((c) => (c || "").trim()));
    set.add("Entretenimiento");
    return ["Todos", ...Array.from(set).filter(Boolean)];
  }, [categories]);

  // Dropdown País
  const [openCountries, setOpenCountries] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpenCountries(false);
      }
    };
    if (openCountries) {
      document.addEventListener("mousedown", onClickOutside);
    }
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openCountries]);

  const handleCategoryClick = (cat) => {
    onCategoryChange?.(cat === "Todos" ? "Todos" : cat);
    // Al cambiar categoría, no cerramos ni alteramos país
  };

  const handleToggleCountries = () => {
    setOpenCountries((v) => !v);
  };

  const handleSelectCountry = (country) => {
    onCountryChange?.(country);
    setOpenCountries(false);
  };

  const activeBtn =
    "bg-rose-600/90 text-white border-rose-500 hover:bg-rose-600";
  const baseBtn =
    "px-3 py-1.5 text-sm rounded-lg border border-white/10 text-gray-200 hover:bg-white/10 transition";

  return (
    <div className="max-w-7xl mx-auto px-4 pt-3 pb-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Botones de categoría */}
        {shownCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryClick(cat)}
            className={`${baseBtn} ${
              (selectedCategory || "Todos") === cat ? activeBtn : ""
            }`}
          >
            {cat}
          </button>
        ))}

        {/* Botón País */}
        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={handleToggleCountries}
            className={`${baseBtn} ${
              selectedCountry ? "ring-1 ring-rose-500/40" : ""
            }`}
            title="Filtrar por país"
          >
            País
          </button>

          {/* Panel desplegable con países */}
          {openCountries && (
            <div className="absolute left-0 mt-2 w-64 max-h-80 overflow-auto rounded-lg border border-white/10 bg-black/90 backdrop-blur shadow-xl p-2 z-20">
              {/* Opción Todos / limpiar */}
              <button
                onClick={() => handleSelectCountry("")}
                className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-white/10 text-left text-sm text-gray-200"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-800/60 text-[10px] text-gray-300">
                  —
                </span>
                Todos los países
              </button>

              <div className="my-2 h-px bg-white/10" />

              {(countryItems || []).map((item) => (
                <button
                  key={item.country || "—"}
                  onClick={() => handleSelectCountry(item.country)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-white/10 text-left text-sm text-gray-200"
                >
                  {item.flagUrl ? (
                    <img
                      src={item.flagUrl}
                      alt={`Bandera ${item.country}`}
                      className="h-6 w-6 object-contain rounded-sm bg-gray-800/60 p-[2px]"
                      draggable={false}
                    />
                  ) : (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-800/60 text-[10px] text-gray-300">
                      ?
                    </span>
                  )}
                  <span className="line-clamp-1">{item.country || "—"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Si hay país seleccionado, mostrar pill informativo */}
      {selectedCountry ? (
        <div className="mt-2 text-xs text-gray-400">
          País activo: <span className="text-gray-200">{selectedCountry}</span>
        </div>
      ) : null}
    </div>
  );
}
