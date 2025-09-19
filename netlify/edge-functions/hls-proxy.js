// netlify/edge-functions/hls-proxy.js
// Proxea /hls/* -> https://2-fss-2.streamhoster.com/* y añade CORS y REFERER.

export default async (request) => {
  const url = new URL(request.url);

  // Ej.: /hls/pl_118/206.../chunklist.m3u8  ->  https://2-fss-2.streamhoster.com/pl_118/206.../chunklist.m3u8
  const upstreamPath = url.pathname.replace(/^\/hls\//, "");
  const upstream = `https://2-fss-2.streamhoster.com/${upstreamPath}${url.search}`;

  // Reenviamos headers útiles
  const inHeaders = new Headers(request.headers);
  inHeaders.delete("host");

  // Fuerza REFERER y ORIGIN al dominio del sitio (muchos proveedores lo exigen)
  const siteOrigin = url.origin; // tu dominio (https://tu-sitio.netlify.app)
  inHeaders.set("referer", siteOrigin + "/");
  inHeaders.set("origin", siteOrigin);

  // IMPORTANTE: soporta Range para segmentos .ts
  if (!inHeaders.has("range") && request.headers.get("range")) {
    inHeaders.set("range", request.headers.get("range"));
  }

  const resp = await fetch(upstream, {
    method: request.method,
    headers: inHeaders,
  });

  // Copia headers y agrega CORS
  const out = new Headers(resp.headers);
  out.set("access-control-allow-origin", "*");
  out.set("access-control-allow-credentials", "false");
  out.set("access-control-allow-headers", "origin,range,accept,content-type");
  out.set("access-control-allow-methods", "GET,HEAD,OPTIONS");

  // (Opcional) headers de debug para inspección en Network
  out.set("x-proxy-target", upstream);

  return new Response(resp.body, { status: resp.status, headers: out });
}

