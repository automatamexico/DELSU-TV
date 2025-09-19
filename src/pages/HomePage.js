import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import CategoryFilter from '../components/CategoryFilter';
import ChannelGrid from '../components/ChannelGrid';
import VideoPlayer from '../components/VideoPlayer';
import { useChannels } from '../hooks/useChannels';
import { useAuth } from '../context/AuthContext';
import { categories } from '../data/channels'; // Keep for categories list

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
    // Track view
    if (channel.id) {
      // Use useViews hook if needed, but for simplicity, track here
      console.log('Tracking view for channel:', channel.id);
    }
  };

  const handleClosePlayer = () => {
    setSelectedChannel(null);
  };

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

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <ChannelGrid 
          channels={channels}
          onChannelClick={handleChannelClick}
        />
      </motion.main>

      <AnimatePresence>
        {selectedChannel && (
          <VideoPlayer
            channel={selectedChannel}
            onClose={handleClosePlayer}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePage;