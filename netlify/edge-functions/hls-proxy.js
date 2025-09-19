// netlify/edge-functions/hls-proxy.js
// Proxea /hls/* -> https://2-fss-2.streamhoster.com/* y añade CORS.

export default async (request, context) => {
  const url = new URL(request.url);

  // Lo que pidas como /hls/pl_118/206.../chunklist.m3u8
  // se reenviará a https://2-fss-2.streamhoster.com/pl_118/206.../chunklist.m3u8
  const upstreamPath = url.pathname.replace(/^\/hls\//, "");
  const upstream = `https://2-fss-2.streamhoster.com/${upstreamPath}${url.search}`;

  // Reenvía headers útiles (Range es importante para .ts)
  const headers = new Headers(request.headers);
  headers.delete("host");

  // Si el proveedor exige un referer, descomenta y pon tu dominio:
  // headers.set("referer", "https://tu-dominio.netlify.app/");

  const resp = await fetch(upstream, {
    method: request.method,
    headers,
  });

  // Copiamos headers del upstream y añadimos CORS
  const out = new Headers(resp.headers);
  out.set("access-control-allow-origin", "*");
  out.set("access-control-allow-credentials", "false");
  out.set("access-control-allow-headers", "origin,range,accept,content-type");
  out.set("access-control-allow-methods", "GET,HEAD,OPTIONS");

  return new Response(resp.body, { status: resp.status, headers: out });
}

