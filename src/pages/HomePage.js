// src/pages/HomePage.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import Header from "../components/Header";
import CategoryFilter from "../components/CategoryFilter";
import ChannelGrid from "../components/ChannelGrid";
import PlayerModal from "../components/PlayerModal"; // ⬅️ usa el modal, no VideoPlayer directo
import { useChannels } from "../hooks/useChannels";
import { useAuth } from "../context/AuthContext";
import { categories } from "../data/channels";

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

  // Estado para abrir el modal con el canal seleccionado
  const [selectedChannel, setSelectedChannel] = useState(null);

  const handleChannelClick = (channel) => {
    // Asegúrate de pasar el OBJETO COMPLETO del canal
    setSelectedChannel(channel);
  };

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
          />

          <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            <ChannelGrid channels={channels} onChannelClick={handleChannelClick} />
          </motion.main>
        </>
      )}

      {/* Modal del reproductor */}
      <PlayerModal
        open={!!selectedChannel}
        onClose={handleClosePlayer}
        channel={selectedChannel}
      />
    </div>
  );
}
