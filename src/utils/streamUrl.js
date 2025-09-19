// src/utils/streamUrl.js
export function toProxiedHls(url) {
  if (!url || typeof url !== "string") return url;

  // Forzamos https y usamos el proxy /hls/*
  const u = url.replace(/^http:\/\//i, "https://");

  const HOST = "https://2-fss-2.streamhoster.com/";
  if (u.startsWith(HOST)) {
    return "/hls/" + u.slice(HOST.length);
  }
  // Si tu canal viene de otro host, por ahora lo dejamos tal cual
  return u;
}
