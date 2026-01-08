// src/pages/HomePage.jsx
import React, { useState, Suspense, useTransition, useDeferredValue } from "react";
import { motion } from "framer-motion";
import Header from "../components/Header";
import CategoryFilter from "../components/CategoryFilter";
import ChannelGrid from "../components/ChannelGrid";
// ⬇️ lazy load del modal (reduce JS inicial)
const PlayerModal = React.lazy(() => import("../components/PlayerModal"));
import { useChannels } from "../hooks/useChannels";
import { useAuth } from "../context/AuthContext";
import { categories } from "../data/channels";

function ChannelsSkeleton() {
  const items = Array.from({ length: 12 });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {items.map((_, i) => (
        <div key={i} className="animate-pulse bg-gray-800/40 border border-gray-700 rounded-xl h-48" />
      ))}
    </div>
  );
}

export default function HomePage() {
  const { profile } = useAuth();
  const userRole = profile?.role || "user";

  const [searchTerm, setSearchTerm] = useState("");
  // ⬇️ deffered (evita recalcular la grilla por cada tecla)
  const deferredSearch = useDeferredValue(searchTerm);

  const {
    channels,
    loading: channelsLoading,
    errorMsg,
    selectedCategory,
    setSelectedCategory,
    filters,
    handleFilterChange,
  } = useChannels(userRole, { search: deferredSearch }); // si tu hook acepta opciones

  const [selectedChannel, setSelectedChannel] = useState(null);
  const [isPending, startTransition] = useTransition(); // UI se mantiene responsiva

  const handleChannelClick = (channel) => {
    startTransition(() => setSelectedChannel(channel));
  };

  const handleClosePlayer = () => setSelectedChannel(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onFilterChange={handleFilterChange}
        filters={filters}
        busy={isPending || channelsLoading}
      />

      {channelsLoading && channels.length === 0 ? (
        <ChannelsSkeleton />
      ) : (
        <>
          {channelsLoading && channels.length > 0 && (
            <div className="px-4 py-2 text-xs text-gray-400">Actualizando canales…</div>
          )}

          {errorMsg && <div className="px-4 py-2 text-xs text-red-400">{errorMsg}</div>}

          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />

          <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
            <ChannelGrid channels={channels} onChannelClick={handleChannelClick} />
          </motion.main>
        </>
      )}

      {/* ⬇️ El modal se monta en lazy, con un fallback liviano */}
      <Suspense fallback={null}>
        {selectedChannel && (
          <PlayerModal open={!!selectedChannel} onClose={handleClosePlayer} channel={selectedChannel} />
        )}
      </Suspense>
    </div>
  );
}
