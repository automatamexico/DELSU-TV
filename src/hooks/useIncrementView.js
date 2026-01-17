// src/hooks/useIncrementView.js
import { useEffect } from "react";

export default function useIncrementView(channelId) {
  useEffect(() => {
    if (!channelId) return;
    let cancelled = false;

    (async () => {
      try {
        // Llama SIEMPRE al abrir el modal (sin antiduplicado).
        const url = `/log-view?channel_id=${encodeURIComponent(channelId)}&t=${Date.now()}`;
        await fetch(url, {
          method: "GET",
          headers: { "cache-control": "no-cache" },
          // no 'no-cors': queremos ver errores si los hay
        });
      } catch (e) {
        // opcional: console.warn("log-view failed", e);
      }
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [channelId]);
}
