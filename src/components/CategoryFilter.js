// src/components/CategoryFilter.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

export default function CategoryFilter({
  categories = [],
  selectedCategory,
  onCategoryChange,
}) {
  // Asegurar que "Entretenimiento" esté y quede ANTES de "País"
  const uiCategories = useMemo(() => {
    const base = [...categories];
    // Inserta "Entretenimiento" si no viene en el array
    if (!base.includes("Entretenimiento")) {
      base.push("Entretenimiento");
    }
    // Remueve "País" si estuviera en la lista para que nuestro botón quede al final
    const filtered = base.filter((c) => c !== "País");
    return filtered;
  }, [categories]);

  const [showCountryMenu, setShowCountryMenu] = useState(false);
  const [countries, setCountries] = useState([]);

  // Carga países (distintos) desde 'channels'
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("country, url_bandera")
        .not("country", "is", null);

      if (!isMounted) return;
      if (error) {
        // eslint-disable-next-line no-console
        console.warn("[CategoryFilter] Error cargando países:", error.message);
        setCountries([]);
        return;
      }

      // Normaliza y ordena
      const uniq = new Map();
      (data || []).forEach((row) => {
        const name = String(row.country || "").trim();
        if (!name) return;
        if (!uniq.has(name)) {
          uniq.set(name, { country: name, flag: row.url_bandera || null });
        }
      });
      const arr = Array.from(uniq.values()).sort((a, b) =>
        a.country.localeCompare(b.country)
      );
      setCountries(arr);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePickCategory = (cat) => {
    onCategoryChange?.(cat);
  };

  const handlePickCountry = (c) => {
    // Envía una cadena simple para no romper la firma existente
    onCategoryChange?.(`País:${c.country}`);
    setShowCountryMenu(false);
  };

  return (
    <div className="w-full">
      <div className="w-full flex items-center justify-center gap-2 flex-wrap px-4 py-3">
        {/* Botones de categorías existentes + “Entretenimiento” insertado */}
        {uiCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => handlePickCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              selectedCategory === cat
                ? "bg-rose-600 text-white border-rose-500"
                : "bg-white/5 text-gray-200 border-white/10 hover:bg-white/10"
            }`}
          >
            {cat}
          </button>
        ))}

        {/* Botón País (siempre al final, a la derecha de Entretenimiento) */}
        <button
          type="button"
          onClick={() => setShowCountryMenu(true)}
          className={`px-3 py-1.5 rounded-full text-sm border transition ${
            typeof selectedCategory === "string" &&
            selectedCategory.startsWith("País:")
              ? "bg-rose-600 text-white border-rose-500"
              : "bg-white/5 text-gray-200 border-white/10 hover:bg-white/10"
          }`}
        >
          País
        </button>
      </div>

      {/* Overlay del menú de países (no queda oculto por nada) */}
      {showCountryMenu && (
        <div
          className="fixed inset-0 z-50"
          aria-modal="true"
          role="dialog"
          onClick={() => setShowCountryMenu(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Panel centrado */}
          <div
            className="absolute left-1/2 top-20 -translate-x-1/2 w-[92vw] max-w-2xl rounded-xl border border-white/10 bg-[#0b1016] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Selecciona un país</h3>
              <button
                type="button"
                onClick={() => setShowCountryMenu(false)}
                className="text-xs text-gray-300 hover:text-white px-2 py-1 rounded bg-white/10"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[60vh] overflow-auto">
              {countries.length === 0 ? (
                <div className="col-span-full text-xs text-gray-400">
                  No hay países disponibles.
                </div>
              ) : (
                countries.map((c) => (
                  <button
                    key={c.country}
                    type="button"
                    onClick={() => handlePickCountry(c)}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-2 py-2 text-left"
                  >
                    {c.flag ? (
                      <img
                        src={c.flag}
                        alt={c.country}
                        className="h-5 w-5 object-contain rounded-sm border border-white/10"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded-sm bg-white/10" />
                    )}
                    <span className="text-sm text-gray-100 truncate">{c.country}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
