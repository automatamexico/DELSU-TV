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

// quitar duplicados por id/slug/title
function dedupeChannels(list = []) {
  const seen = new Set();
  const out = [];
  for (const ch of list) {
    const key =
      (ch?.id && `id:${ch.id}`) ||
      (ch?.slug && `slug:${norm(ch.slug)}`) ||
      (ch?.title && `title:${norm(ch.title)}`) ||
      Math.random().toString(36).slice(2);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(ch);
    }
  }
  return out;
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

  // País seleccionado
  const [selectedCountry, setSelectedCountry] = useState("");

  // Países para filtro
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

  // Filtrado por país (sobre lo que ya trae useChannels)
  const countryFilteredChannels = useMemo(() => {
    if (!selectedCountry) return visibleChannels;
    return (visibleChannels || []).filter(
      (c) => norm(c?.country || c?.pais) === norm(selectedCountry)
    );
  }, [visibleChannels, selectedCountry]);

  // Resultados finales sin duplicados
  const finalChannels = useMemo(
    () => dedupeChannels(countryFilteredChannels),
    [countryFilteredChannels]
  );

  // Señales de filtro activo
  const hasSearch = norm(searchTerm).length > 0;
  const catNorm = norm(selectedCategory);
  const hasCategory =
    !!catNorm && !/^(todas|todos|all|categoria|categoría)?$/.test(catNorm);
  const hasCountry = norm(selectedCountry).length > 0;

  // Si hay cualquier filtro o el tamaño cambió vs. total visible => NO carrusel
  const isFiltering =
    hasSearch ||
    hasCategory ||
    hasCountry ||
    finalChannels.length !== visibleChannels.length;

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
            {isFiltering ? (
              // >>> Sólo resultados (sin carrusel) y sin duplicados <<<
              <ChannelGrid
                channels={finalChannels}
                onChannelClick={handleChannelClick}
              />
            ) : (
              // >>> Carrusel normal (sin filtros) <<<
              <div className="p-4">
                <CarouselGridLimited
                  items={finalChannels}
                  renderItem={(it) => (
                    <ChannelCard channel={it} onClick={handleChannelClick} />
                  )}
                  maxRows={10}
                  cardWidth={360}
                  gap={24}
                  baseSpeed={40}
                />
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
