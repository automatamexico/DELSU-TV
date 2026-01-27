// src/pages/HomePage.jsx
import React, { useState, Suspense, lazy, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "../components/Header";
import CategoryFilter from "../components/CategoryFilter";
import ChannelGrid from "../components/ChannelGrid";
import ChannelCard from "../components/ChannelCard";
import CarouselGridLimited from "../components/CarouselGridLimited";
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

  // Ocultar suspendidos
  const visibleChannels = useMemo(
    () => (channels || []).filter((c) => !c?.is_suspended),
    [channels]
  );

  // Estado País
  const [selectedCountry, setSelectedCountry] = useState("");

  // Países únicos (para el filtro)
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

  // Filtro adicional por país (sobre lo que ya venga filtrado del hook)
  const countryFilteredChannels = useMemo(() => {
    if (!selectedCountry) return visibleChannels;
    return (visibleChannels || []).filter(
      (c) => norm(c?.country || c?.pais) === norm(selectedCountry)
    );
  }, [visibleChannels, selectedCountry]);

  // ¿Estamos en Home sin filtros? (sin búsqueda, sin país, categoría = Todos/empty)
  const isHomeNoFilters = useMemo(() => {
    const cat = (selectedCategory || "").trim().toLowerCase();
    const isCatAll = cat === "" || cat === "todos";
    const hasSearch = !!norm(searchTerm);
    const hasCountry = !!norm(selectedCountry);
    return isCatAll && !hasSearch && !hasCountry;
  }, [selectedCategory, searchTerm, selectedCountry]);

  // Deduplicador estable por id/slug/título (evita que un canal se repita)
  const uniqueFiltered = useMemo(() => {
    const seen = new Set();
    return (countryFilteredChannels || []).filter((c) => {
      const key = norm(
        c?.id ?? c?.slug ?? c?.title ?? c?.name ?? c?.channel_name ?? ""
      );
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
            {isHomeNoFilters ? (
              // HOME: Carrusel (únicamente cuando NO hay filtros)
              <CarouselGridLimited
                items={uniqueFiltered}
                className="px-4 pb-6"
                // Ajusta tamaños si lo necesitas, estos conservan la card completa
                rowHeight={460}
                cardWidth={320}
                gap={20}
                baseSpeed={40}
                renderItem={(item) => (
                  <ChannelCard channel={item} onClick={handleChannelClick} />
                )}
              />
            ) : (
              // FILTRADO: Grid normal, sin carrusel, sin duplicados
              <ChannelGrid
                channels={uniqueFiltered}
                onChannelClick={handleChannelClick}
              />
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
