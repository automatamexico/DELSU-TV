// src/pages/HomePage.js
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import CategoryFilter from '../components/CategoryFilter';
import ChannelGrid from '../components/ChannelGrid';
import VideoPlayer from '../components/VideoPlayer';
import { useChannels } from '../hooks/useChannels';
import { useAuth } from '../context/AuthContext';
import { categories } from '../data/channels';

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

const HomePage = () => {
  const { profile } = useAuth();
  const userRole = profile?.role || 'user';

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

  const handleChannelClick = (channel) => {
    setSelectedChannel(channel);
  };

  const handleClosePlayer = () => {
    setSelectedChannel(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onFilterChange={handleFilterChange}
        filters={filters}
      />

      {channelsLoading && channels.length === 0 ? (
        // Primera visita sin cache → skeleton (no pantalla en blanco)
        <ChannelsSkeleton />
      ) : (
        <>
          {/* Barra de estado pequeña si está revalidando con datos en pantalla */}
          {channelsLoading && channels.length > 0 && (
            <div className="px-4 py-2 text-xs text-gray-400">
              Actualizando canales…
            </div>
          )}

          {errorMsg && (
            <div className="px-4 py-2 text-xs text-red-400">
              {errorMsg}
            </div>
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

      <AnimatePresence>
        {selectedChannel && (
          <VideoPlayer channel={selectedChannel} onClose={handleClosePlayer} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePage;
