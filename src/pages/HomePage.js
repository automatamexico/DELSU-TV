// src/pages/HomePage.jsx
import React, { useState, Suspense, lazy, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "../components/Header";
import CategoryFilter from "../components/CategoryFilter";
// ⬇️ usamos el carrusel y la tarjeta
import CarouselGridLimited from "../components/CarouselGridLimited";
import ChannelCard from "../components/ChannelCard";
import { useChannels } from "../hooks/useChannels";
import { useAuth } from "../context/AuthContext";
import { categories } from "../data/channels";

const PlayerModal = lazy(() => import("../components/PlayerModal"));

function ChannelsSkeleton() {
  const items = Array.from({ length: 12 });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {items.map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-gray-800/40 border border-gray-700 rounded-xl h-48"
        />
      ))}
    </div>
  );
}

function norm(v) {
  return String(v || "").trim().toLowerCase();
}

export default function HomePage() {
  // ---- TÍTULO DE LA PESTAÑA ----
  useEffect(() => {
    const prev = document.title;
    document.title = "HispanaTV Home";
    return () => {
      document.title = prev || "HispanaTV";
    };
  }, []);
  // -------------------------------

  const { profile } = useAuth();
  const userRole = profile?.role || "user";

  const {
    channels,
    loading: channelsLoading,
    errorMsg,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    filters,
    handleFilterChange,
  } = useChannels(userRole);

  const [selectedChannel, setSelectedChannel] = useState(null);

  // Ocultar canales suspendidos
  const visibleChannels = useMemo(
    () => (channels || []).filter((c) => !c?.is_suspended),
    [channels]
  );

  // Estado de País seleccionado
  const [selectedCountry, setSelectedCountry] = useState("");

  // Lista de países únicos + bandera desde canales visibles
  const countryItems = useMemo(() => {
    const map = new Map();
    (visibleChannels || []).forEach((c) => {
      const country = c?.country || c?.pais || "";
      if (!country) return;
      const key = country.trim();
      if (!map.has(key)) {
        map.set(key, {
          country: key,
          flagUrl: c?.url_bandera || c?.bandera_url || null,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.country.localeCompare(b.country, "es", { sensitivity: "base" })
    );
  }, [visibleChannels]);

  // Filtrado adicional por país
  const countryFilteredChannels = useMemo(() => {
    if (!selectedCountry) return visibleChannels;
    return (visibleChannels || []).filter(
      (c) => norm(c?.country || c?.pais) === norm(selectedCountry)
    );
  }, [visibleChannels, selectedCountry]);

  // ✅ "Todos" NO cuenta como filtro activo (es el estado Home)
  const isTodosCategory = useMemo(() => {
    const c = norm(selectedCategory);
    return c === "" || c === "todos" || c === "todo" || c === "all";
  }, [selectedCategory]);

  // ✅ ¿Hay filtros activos? (categoría ≠ Todos, país o búsqueda)
  const hasActiveFilters = useMemo(() => {
    const hasSearch = norm(searchTerm).length > 0;
    const hasCategory = !isTodosCategory; // solo cuenta si NO es Todos/All
    const hasCountry = norm(selectedCountry).length > 0;
    return hasSearch || hasCategory || hasCountry;
  }, [searchTerm, selectedCountry, isTodosCategory]);

  // ✅ Evitar repetidos al mostrar resultados filtrados (por id o por url)
  const uniqueFilteredChannels = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const c of countryFilteredChannels || []) {
      const key =
        c?.id ??
        c?.channel_id ??
        c?.uuid ??
        c?.stream_url ??
        c?.m3u8_url ??
        c?.url ??
        c?.title ??
        c?.name ??
        JSON.stringify(c);

      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out;
  }, [countryFilteredChannels]);

  const handleChannelClick = (channel) => setSelectedChannel(channel);
  const handleClosePlayer = () => setSelectedChannel(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onFilterChange={handleFilterChange}
        filters={filters}
      />

      {channelsLoading && channels.length === 0 ? (
        <ChannelsSkeleton />
      ) : (
        <>
          {channelsLoading && channels.length > 0 && (
            <div className="px-4 py-2 text-xs text-gray-400">
              Actualizando canales…
            </div>
          )}

          {errorMsg && (
            <div className="px-4 py-2 text-xs text-red-400">{errorMsg}</div>
          )}

          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            /* País */
            selectedCountry={selectedCountry}
            onCountryChange={setSelectedCountry}
            countryItems={countryItems}
          />

          <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            {!hasActiveFilters ? (
              // ✅ HOME (Todos + sin país + sin búsqueda): carrusel
              <CarouselGridLimited
                items={countryFilteredChannels}
                maxRows={5}
                cardWidth={360} // ancho donde la card cabe completa (poster + texto)
                gap={24}
                baseSpeed={40}
                renderItem={(ch) => (
                  <ChannelCard channel={ch} onClick={handleChannelClick} />
                )}
              />
            ) : (
              // ✅ Con filtros/búsqueda: grid fijo (sin carrusel) y SIN repetidos
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                {uniqueFilteredChannels.map((ch) => (
                  <ChannelCard
                    key={
                      ch?.id ??
                      ch?.channel_id ??
                      ch?.uuid ??
                      ch?.stream_url ??
                      ch?.url ??
                      ch?.title ??
                      ch?.name
                    }
                    channel={ch}
                    onClick={handleChannelClick}
                  />
                ))}
              </div>
            )}
          </motion.main>
        </>
      )}

      <Suspense fallback={null}>
        {selectedChannel && (
          <PlayerModal
            open={!!selectedChannel}
            onClose={handleClosePlayer}
            channel={selectedChannel}
          />
        )}
      </Suspense>
    </div>
  );
}
