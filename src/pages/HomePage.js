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
import { toProxiedHls } from '../utils/streamUrl';

const HomePage = () => {
  const { profile } = useAuth();
  const userRole = profile?.role;

  const {
    channels,
    loading: channelsLoading,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    filters,
    handleFilterChange
  } = useChannels(userRole);

  const [selectedChannel, setSelectedChannel] = useState(null);

  const handleChannelClick = (channel) => {
    setSelectedChannel(channel);
  };

  const handleClosePlayer = () => setSelectedChannel(null);

  if (channelsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        Cargando canales...
      </div>
    );
  }

  const streamSrc = selectedChannel
    ? toProxiedHls(
        selectedChannel.stream_url ||
        selectedChannel.streamUrl ||
        selectedChannel.m3u8 ||
        selectedChannel.url ||
        ''
      )
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onFilterChange={handleFilterChange}
        filters={filters}
      />

      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="container mx-auto px-4 pb-16"
      >
        <ChannelGrid channels={channels} onChannelClick={handleChannelClick} />
      </motion.main>

      <AnimatePresence>
        {selectedChannel && (
          <motion.div
            key="player-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              className="w-full max-w-5xl"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-white text-lg font-semibold truncate pr-4">
                  {selectedChannel?.name || 'Reproducción'}
                </h3>
                <button
                  onClick={handleClosePlayer}
                  className="text-gray-300 hover:text-white bg-gray-800/60 px-3 py-1 rounded"
                >
                  Cerrar
                </button>
              </div>

              {streamSrc ? (
                <VideoPlayer src={streamSrc} />
              ) : (
                <div className="w-full aspect-video bg-black/60 text-red-300 flex items-center justify-center rounded-lg">
                  No se encontró URL de reproducción para este canal.
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePage;
