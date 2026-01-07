// src/components/ChannelGrid.jsx
import React from "react";
import ChannelCard from "./ChannelCard";

export default function ChannelGrid({ channels = [], onChannelClick }) {
  if (!channels?.length) {
    return (
      <div className="p-6 text-center text-gray-400">
        No hay canales para mostrar.
      </div>
    );
  }

  return (
    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {channels.map((ch) => (
        <ChannelCard key={ch.id || ch.slug || ch.name} channel={ch} onClick={onChannelClick} />
      ))}
    </div>
  );
}
