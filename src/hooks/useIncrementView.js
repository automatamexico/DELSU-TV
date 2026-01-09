// src/hooks/useIncrementView.js
import { useEffect, useRef } from "react";
import { supabase } from "../supabaseClient"; // ajusta si tu ruta difiere

/**
 * Llama al RPC SOLO una vez por apertura del modal.
 * Pasa null/undefined si no quieres contar todavía.
 */
export default function useIncrementView(channelId) {
  const doneRef = useRef(false);

  useEffect(() => {
    if (!channelId || doneRef.current) return;

    doneRef.current = true; // evita dobles llamadas por renders
    (async () => {
      const { data, error } = await supabase
        .rpc("increment_channel_views", { p_channel_id: channelId });

      if (error) {
        // eslint-disable-next-line no-console
        console.warn("[views] RPC error:", error.message);
      } else {
        // eslint-disable-next-line no-console
        console.info("[views] nuevo views_count:", data);
      }
    })();
  }, [channelId]);
}
