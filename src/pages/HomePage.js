// src/pages/HomePage.jsx
import React, { useState, Suspense, lazy, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "../components/Header";
import CategoryFilter from "../components/CategoryFilter";
import CarouselGridLimited from "../components/CarouselGridLimited";
import ChannelCard from "../components/ChannelCard";
import { useChannels } from "../hooks/useChannels";
import { useAuth } from "../context/AuthContext";
import { categories } from "../data/channels";
import { logEvent } from "../utils/analytics";

const PlayerModal = lazy(() => import("../components/PlayerModal"));

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

function norm(v) {
  return String(v || "").trim().toLowerCase();
}

export default function HomePage() {

  useEffect(() => {
    const prev = document.title;
    document.title = "HispanaTV Home";

    logEvent({ event_type: "page_view", page_path: window.location.pathname });

    return () => {
      document.title = prev || "HispanaTV";
    };
  }, []);

  // 🔥 MONETAG IN-PAGE (AGREGADO SIN ROMPER NADA)
  useEffect(() => {
    const script = document.createElement("script");

    script.innerHTML = `(function(s){
      s.dataset.zone='10760701',
      s.src='https://nap5k.com/tag.min.js'
    })([document.documentElement, document.body]
      .filter(Boolean)
      .pop()
      .appendChild(document.createElement('script')));`;

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

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

  const [selectedChannel, setSelectedChannel] = useState(null);

  const visibleChannels = useMemo(
    () => (channels || []).filter((c) => !c?.is_suspended),
    [channels]
  );

  const [selectedCountry, setSelectedCountry] = useState("");

  const countryItems = useMemo(() => {
    const map = new Map();
    (visibleChannels || []).forEach((c) => {
      const country = c?.country || c?.pais || "";
      if (!country) return;
      const key = country.trim();
      if (!map.has(key)) {
        map.set(key, {
          country: key,
          flagUrl: c?.url_bandera || c?.bandera_url || null,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.country.localeCompare(b.country, "es", { sensitivity: "base" })
    );
  }, [visibleChannels]);

  const countryFilteredChannels = useMemo(() => {
    if (!selectedCountry) return visibleChannels;
    return (visibleChannels || []).filter(
      (c) => norm(c?.country || c?.pais) === norm(selectedCountry)
    );
  }, [visibleChannels, selectedCountry]);

  const isTodosCategory = useMemo(() => {
    const c = norm(selectedCategory);
    return c === "" || c === "todos" || c === "todo" || c === "all";
  }, [selectedCategory]);

  const hasActiveFilters = useMemo(() => {
    const hasSearch = norm(searchTerm).length > 0;
    const hasCategory = !isTodosCategory;
    const hasCountry = norm(selectedCountry).length > 0;
    return hasSearch || hasCategory || hasCountry;
  }, [searchTerm, selectedCountry, isTodosCategory]);

  const uniqueFilteredChannels = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const c of countryFilteredChannels || []) {
      const key =
        c?.id ??
        c?.channel_id ??
        c?.uuid ??
        c?.stream_url ??
        c?.m3u8_url ??
        c?.url ??
        c?.title ??
        c?.name ??
        JSON.stringify(c);

      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out;
  }, [countryFilteredChannels]);

  // 🔥 MONETAG DIRECT LINK (YA TENÍAS)
const handleChannelClick = (channel, event) => {
  // 🛑 SOLO permitir clicks reales
  if (!event || !event.isTrusted) return;

  const now = Date.now();

  const channelId =
    channel?.id ||
    channel?.channel_id ||
    channel?.uuid ||
    channel?.stream_url ||
    channel?.url;

  const lastChannel = window.lastChannelAd;
  const lastTime = window.lastAdTime || 0;

  const isDifferentChannel = lastChannel !== channelId;
  const timePassed = now - lastTime > 900000;

  if (isDifferentChannel || timePassed) {
    window.lastChannelAd = channelId;
    window.lastAdTime = now;

    // 👇 SOLO UNA apertura y con pequeño delay (mejor en móvil)
    setTimeout(() => {
      window.open("https://omg10.com/4/10759952", "_blank");
    }, 200);
  }

  // ▶️ abrir canal normal
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

      <div className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-300">
        <h1 className="text-2xl font-bold text-white mb-3">
          Canales de televisión en vivo
        </h1>

        <p className="text-sm leading-relaxed">
          HispanaTV es una plataforma de televisión en línea que reúne canales en
          vivo de diferentes países en un solo lugar.
        </p>
      </div>

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
            selectedCountry={selectedCountry}
            onCountryChange={setSelectedCountry}
            countryItems={countryItems}
          />

          <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!hasActiveFilters ? (
              <CarouselGridLimited
                items={countryFilteredChannels}
                maxRows={5}
                cardWidth={360}
                gap={24}
                baseSpeed={40}
                renderItem={(ch) => (
                  <ChannelCard channel={ch} onClick={handleChannelClick} />
                )}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                {uniqueFilteredChannels.map((ch) => (
                  <ChannelCard
                    key={ch.id || ch.url}
                    channel={ch}
                    onClick={handleChannelClick}
                  />
                ))}
              </div>
            )}
          </motion.main>
        </>
      )}

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
