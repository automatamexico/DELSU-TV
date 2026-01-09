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
  // Normaliza categorías, evita duplicado de "Todos" y asegura "Entretenimiento"
  const categoryList = useMemo(() => {
    const base = Array.isArray(categories) ? categories : [];
    const set = new Set(
      base.map((c) => (typeof c === "string" ? c : c?.name).trim())
    );
    set.delete("Todos");
    // fuerza que exista "Entretenimiento"
    if (!set.has("Entretenimiento")) set.add("Entretenimiento");
    return ["Todos", ...Array.from(set)];
  }, [categories]);

  const [showCountries, setShowCountries] = useState(false);

  const handleCategoryClick = (cat) => {
    onCategoryChange?.(cat);
    if (showCountries) setShowCountries(false);
  };

  const handleCountryToggle = () => setShowCountries((s) => !s);

  const handleCountrySelect = (country) => {
    onCountryChange?.(country || "");
    setShowCountries(false);
  };

  return (
    <div className="px-4 pt-3 relative">
      {/* Barra de categorías centrada */}
      <div className="flex flex-wrap justify-center items-center gap-2 pb-2">
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

          {/* Dropdown País (mayor z-index para que no lo tape nada) */}
          {showCountries && (
            <div
              className="
                absolute left-1/2 -translate-x-1/2 z-50 mt-2
                w-[min(90vw,560px)]
                rounded-lg border border-gray-700 bg-black/90 backdrop-blur
                p-2 shadow-2xl
                max-h-none overflow-visible
              "
            >
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

              <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1">
                {countryItems.map(({ country, flagUrl }) => (
                  <button
                    key={country}
                    onClick={() => handleCountrySelect(country)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded text-sm ${
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
