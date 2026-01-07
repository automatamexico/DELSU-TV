import React from "react";

export default function ChannelCard({ channel, onPlay }) {
  return (
    <div
      className="bg-[#12161d] rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition cursor-pointer"
      onClick={() => onPlay(channel)}
    >
      <div className="aspect-[16/9] w-full bg-black">
        <img
          src={channel?.image || channel?.poster || channel?.logo}
          alt={channel?.name || "Canal"}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-3">
        <h3 className="text-white font-semibold truncate">
          {channel?.name || "Canal"}
        </h3>
        <p className="text-white/60 text-sm truncate">
          {channel?.country || channel?.category || "En vivo"}
        </p>
      </div>
    </div>
  );
}
