// src/components/CategoryFilter.jsx
import React, { useState, useMemo } from "react";

export default function CategoryFilter({
  categories = [],
  selectedCategory = "Todos",
  onCategoryChange,
  // País
  selectedCountry = "",
  onCountryChange,
  countryItems = [],
}) {
  // Evita “Todos” duplicado si ya viene en categories
  const categoryList = useMemo(() => {
    const base = Array.isArray(categories) ? categories : [];
    const set = new Set(base.map((c) => (typeof c === "string" ? c : c?.name).trim()));
    // Asegura que “Todos” exista una sola vez y al inicio
    set.delete("Todos");
    return ["Todos", ...Array.from(set)];
  }, [categories]);

  const [showCountries, setShowCountries] = useState(false);

  const handleCategoryClick = (cat) => {
    if (onCategoryChange) onCategoryChange(cat);
  };

  const handleCountryToggle = () => setShowCountries((s) => !s);

  const handleCountrySelect = (country) => {
    if (onCountryChange) onCountryChange(country || "");
    setShowCountries(false);
  };

  return (
    <div className="px-4 pt-3">
      {/* Barra de categorías */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {categoryList.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                isActive
                  ? "bg-rose-600 text-white border-rose-500"
                  : "bg-gray-900/40 text-gray-200 border-gray-700 hover:border-gray-500"
              }`}
            >
              {cat}
            </button>
          );
        })}

        {/* Botón País */}
        <div className="relative">
          <button
            onClick={handleCountryToggle}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              selectedCountry
                ? "bg-indigo-600 text-white border-indigo-500"
                : "bg-gray-900/40 text-gray-200 border-gray-700 hover:border-gray-500"
            }`}
            title="Filtrar por país"
          >
            {selectedCountry ? `País: ${selectedCountry}` : "País"}
          </button>

          {/* Dropdown de países */}
          {showCountries && (
            <div className="absolute z-20 mt-2 w-56 max-h-72 overflow-auto rounded-lg border border-gray-700 bg-black/90 backdrop-blur p-2 shadow-xl">
              <button
                onClick={() => handleCountrySelect("")}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded text-sm ${
                  !selectedCountry
                    ? "bg-gray-800 text-white"
                    : "text-gray-200 hover:bg-gray-800"
                }`}
              >
                <span className="inline-block w-5 h-5 rounded bg-gray-700" />
                Todos los países
              </button>

              {countryItems.map(({ country, flagUrl }) => (
                <button
                  key={country}
                  onClick={() => handleCountrySelect(country)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded text-sm mt-1 ${
                    selectedCountry === country
                      ? "bg-gray-800 text-white"
                      : "text-gray-200 hover:bg-gray-800"
                  }`}
                  title={country}
                >
                  {flagUrl ? (
                    <img
                      src={flagUrl}
                      alt={country}
                      className="w-5 h-5 object-contain rounded"
                      loading="lazy"
                    />
                  ) : (
                    <span className="inline-block w-5 h-5 rounded bg-gray-700" />
                  )}
                  <span className="truncate">{country}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
