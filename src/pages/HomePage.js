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
    return <div className="flex items-center justify-center min-h-screen">Cargando canales...</div>;
  }

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

      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}>
        <ChannelGrid channels={channels} onChannelClick={handleChannelClick} />
      </motion.main>

      <AnimatePresence>
        {selectedChannel && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl">
              <div className="flex justify-between items-center mb-3 text-white">
                <h2 className="text-xl font-bold">{selectedChannel?.name || 'Canal'}</h2>
                <button
                  onClick={handleClosePlayer}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded"
                >
                  Cerrar
                </button>
              </div>

              {/* 👇 PASO CLAVE: le pasamos la URL original explícita */}
              <VideoPlayer
                src={selectedChannel?.stream_url || selectedChannel?.streamUrl || selectedChannel?.url || ''}
                poster={selectedChannel?.poster}
                autoPlay
                controls
                muted
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePage;

