// src/utils/streamUrl.js
export function toProxiedHls(url) {
  const PREFIX = "https://2-fss-2.streamhoster.com/";
  if (typeof url === "string" && url.startsWith(PREFIX)) {
    return "/hls/" + url.slice(PREFIX.length);
  }
  // Si no coincide con ese dominio, deja la URL tal cual.
  return url;
}
