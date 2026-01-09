// src/hooks/useIncrementView.js
import { useEffect, useRef } from "react";
import { supabase } from "../supabaseClient"; // ← deja esta ruta como la que ya usas en el proyecto

/**
 * Incrementa el contador de vistas una sola vez cuando hay channelId válido.
 * No toca UI; sólo hace el RPC de forma segura con async/await.
 */
export default function useIncrementView(channelId, enabled = true) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !channelId || firedRef.current) return;

    firedRef.current = true;

    (async () => {
      try {
        const { error } = await supabase.rpc("increment_channel_view", {
          p_channel_id: channelId,
        });
        if (error) {
          // No rompemos la UI; sólo log.
          console.error("[views] RPC error:", error);
        }
      } catch (err) {
        console.error("[views] RPC failed:", err);
      }
    })();
  }, [enabled, channelId]);
}
