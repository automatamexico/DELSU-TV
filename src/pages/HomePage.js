// src/pages/HomePage.jsx
import React, { useState, useMemo, Suspense, lazy } from "react";
import { motion } from "framer-motion";
import Header from "../components/Header";
import CategoryFilter from "../components/CategoryFilter";
import ChannelGrid from "../components/ChannelGrid";
import { useChannels } from "../hooks/useChannels";
import { useAuth } from "../context/AuthContext";
import { categories } from "../data/channels";

// Lazy-load del modal (mejora rendimiento sin tocar el reproductor)
const PlayerModal = lazy(() => import("../components/PlayerModal"));

// Skeleton simple para primera carga sin cache
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

export default function HomePage() {
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

  // === NUEVO: filtro por país ===
  const [selectedCountry, setSelectedCountry] = useState("");

  // Países únicos + bandera desde la data actual
  const countryItems = useMemo(() => {
    const map = new Map();
    (channels || []).forEach((ch) => {
      const country = ch?.pais || ch?.country || "";
      if (!country) return;
      const flag =
        ch?.url_bandera || ch?.bandera_url || ch?.flag_url || "";
      if (!map.has(country)) {
        map.set(country, { country, flagUrl: flag || "" });
      } else if (!map.get(country).flagUrl && flag) {
        map.set(country, { country, flagUrl: flag });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.country.localeCompare(b.country)
    );
  }, [channels]);

  // Aplica filtro de país sobre el arreglo ya gestionado por useChannels
  const channelsByCountry = useMemo(() => {
    if (!selectedCountry) return channels;
    const ctry = selectedCountry.toLowerCase();
    return (channels || []).filter((ch) => {
      const c = (ch?.pais || ch?.country || "").toLowerCase();
      return c === ctry;
    });
  }, [channels, selectedCountry]);

  const [selectedChannel, setSelectedChannel] = useState(null);
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
            // === NUEVO: props de país ===
            selectedCountry={selectedCountry}
            onCountryChange={setSelectedCountry}
            countryItems={countryItems}
          />

          <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            <ChannelGrid
              channels={channelsByCountry}
              onChannelClick={handleChannelClick}
            />
          </motion.main>
        </>
      )}

      {/* Modal del reproductor (lazy) */}
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
