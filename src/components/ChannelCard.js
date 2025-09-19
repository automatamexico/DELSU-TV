import React from 'react';
import { motion } from 'framer-motion';
import { Play, MapPin, Globe } from 'lucide-react';

const ChannelCard = ({ channel, onClick, index }) => {
  return (
    <motion.div
      className="group cursor-pointer"
      onClick={() => onClick(channel)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="relative overflow-hidden rounded-xl bg-gray-900 shadow-xl">
        <div className="aspect-[3/4] relative">
          <img
            src={channel.poster}
            alt={channel.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <motion.div 
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            whileHover={{ scale: 1.1 }}
          >
            <div className="bg-red-600/90 backdrop-blur-sm rounded-full p-4">
              <Play className="w-8 h-8 text-white fill-current" />
            </div>
          </motion.div>

          <div className="absolute top-3 right-3">
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
              LIVE
            </span>
          </div>

          <div className="absolute top-3 left-3">
            <span className="bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
              {channel.category}
            </span>
          </div>
        </div>

        <div className="p-4">
          <h3 className="text-white font-bold text-lg mb-2 line-clamp-1">
            {channel.name}
          </h3>
          
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm">{channel.country}</span>
            <Globe className="w-4 h-4 text-gray-400 ml-2" />
            <span className="text-gray-400 text-sm">{channel.language}</span>
          </div>

          <p className="text-gray-300 text-sm line-clamp-2 leading-relaxed">
            {channel.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default ChannelCard;