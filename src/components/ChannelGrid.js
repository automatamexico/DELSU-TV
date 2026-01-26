// src/components/ChannelGrid.jsx
import React from "react";
import ChannelCard from "./ChannelCard";

function ChannelGridBase({ channels, onChannelClick }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {channels.map((ch) => (
        <ChannelCard key={ch.id || ch.slug || ch.title} channel={ch} onClick={onChannelClick} />
      ))}
    </div>
  );
}

export default React.memo(ChannelGridBase);
