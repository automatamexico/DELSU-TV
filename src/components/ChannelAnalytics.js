import React, { useState, useEffect } from "react";
import { X } from "lucide-react"; // ✅ Se agregó este import
import { motion, AnimatePresence } from "framer-motion";

const ChannelAnalytics = ({ channel, onClose }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Aquí podrías cargar estadísticas reales del canal
    setStats({
      viewers: 120,
      likes: 35,
      shares: 10,
    });
  }, [channel]);

  return (
    <AnimatePresence>
      {channel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
            className="bg-gray-900 p-6 rounded-xl shadow-lg w-full max-w-lg relative"
          >
            {/* ✅ Botón de cerrar con el ícono X ya importado */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-4">
              Estadísticas de {channel.name}
            </h2>

            {stats ? (
              <div className="space-y-4 text-gray-300">
                <p>👀 Espectadores: {stats.viewers}</p>
                <p>👍 Me gusta: {stats.likes}</p>
                <p>📤 Compartidos: {stats.shares}</p>
              </div>
            ) : (
              <p className="text-gray-500">Cargando estadísticas...</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChannelAnalytics;
