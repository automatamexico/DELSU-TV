// netlify/edge-functions/hls-proxy.js
// Proxy: /hls/*  ->  https://2-fss-2.streamhoster.com/*
// Añade CORS, fuerza Referer/Origin y un User-Agent de navegador.
// Ajusta Content-Type para .m3u8 y .ts.

export default async (request) => {
  const url = new URL(request.url);

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const upstreamPath = url.pathname.replace(/^\/hls\//, '');
  const upstream = `https://2-fss-2.streamhoster.com/${upstreamPath}${url.search}`;

  // Reenviar cabeceras útiles
  const inHeaders = new Headers(request.headers);
  inHeaders.delete('host');

  // Muchos CDNs exigen referer/origin correctos
  const siteOrigin = url.origin;                // p.ej. https://delsutv.netlify.app
  inHeaders.set('referer', siteOrigin + '/');
  inHeaders.set('origin', siteOrigin);

  // User-Agent “realista”
  inHeaders.set(
    'user-agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36'
  );

  // Soporte de Range (segmentos .ts)
  const range = request.headers.get('range');
  if (range) inHeaders.set('range', range);

  const resp = await fetch(upstream, {
    method: request.method,
    headers: inHeaders,
    redirect: 'follow',
    // cache: 'no-store', // descomenta si tu origen cachea mal
  });

  // Copiamos headers y añadimos CORS
  const out = new Headers(resp.headers);
  addCors(out);

  // Asegura Content-Type correcto (algunos orígenes lo mandan como text/plain)
  const pathname = url.pathname.toLowerCase();
  if (pathname.endsWith('.m3u8')) {
    out.set('content-type', 'application/vnd.apple.mpegurl');
  } else if (pathname.endsWith('.ts')) {
    out.set('content-type', 'video/mp2t');
  }

  // Debug útil en Network
  out.set('x-proxy-target', upstream);
  out.set('x-proxy-status', String(resp.status));

  return new Response(resp.body, { status: resp.status, headers: out });
};

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-credentials': 'false',
    'access-control-allow-headers': 'origin,range,accept,content-type',
    'access-control-allow-methods': 'GET,HEAD,OPTIONS',
  };
}
function addCors(headers) {
  const h = corsHeaders();
  for (const k in h) headers.set(k, h[k]);
}


