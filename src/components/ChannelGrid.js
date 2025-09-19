import React from 'react';
import { motion } from 'framer-motion';
import { Tv } from 'lucide-react';
import ChannelCard from './ChannelCard';

const ChannelGrid = ({ channels, onChannelClick }) => {
  if (channels.length === 0) {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center py-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
        >
          <Tv className="w-12 h-12 text-gray-400" />
        </motion.div>
        
        <h3 className="text-2xl font-bold text-white mb-3">
          No se encontraron canales
        </h3>
        
        <p className="text-gray-400 text-center max-w-md">
          No hay canales que coincidan con tu búsqueda. Intenta con otros términos o explora diferentes categorías.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {channels.map((channel, index) => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            onClick={onChannelClick}
            index={index}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default ChannelGrid;