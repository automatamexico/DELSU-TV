// src/hooks/useIncrementView.js
import { useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

export default function useIncrementView(channelId) {
  const once = useRef(false);

  useEffect(() => {
    if (!channelId || once.current) return;
    once.current = true;
    supabase
      .rpc("increment_channel_views", { p_channel_id: channelId })
      .catch(() => {
        // Silencioso: si falla, no rompe el player.
      });
  }, [channelId]);
}
