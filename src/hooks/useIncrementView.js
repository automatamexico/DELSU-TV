import { useEffect } from "react";

export default function useIncrementView(channelId) {
  useEffect(() => {
    if (!channelId) return;
    let cancelled = false;

    const hit = async () => {
      // usa URL absoluta para evitar cualquier basePath/SPA redirect raro
      const url = `${window.location.origin}/log-view?channel_id=${encodeURIComponent(
        channelId
      )}&t=${Date.now()}`;

      try {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "cache-control": "no-cache",
            "content-type": "application/json",
          },
          // mismo origen, no hace falta credentials
        });

        // si por alguna razón el Edge respondiera no-2xx, intentamos 1 retry rápido
        if (!res.ok && !cancelled) {
          await new Promise((r) => setTimeout(r, 400));
          await fetch(url, {
            method: "GET",
            headers: { "cache-control": "no-cache" },
          });
        }
      } catch {
        // último intento “a ciegas” para saltar errores intermitentes
        if (!cancelled) {
          try {
            await fetch(url, { method: "GET" });
          } catch {}
        }
      }
    };

    hit();
    return () => {
      cancelled = true;
    };
  }, [channelId]);
}
