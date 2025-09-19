// netlify/edge-functions/hls-proxy.js
// Proxea /hls/* -> https://2-fss-2.streamhoster.com/*
// Añade CORS + força Referer/Origin + User-Agent de navegador.

export default async (request) => {
  const url = new URL(request.url);

  // OPTIONS CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  const upstreamPath = url.pathname.replace(/^\/hls\//, '');
  const upstream = `https://2-fss-2.streamhoster.com/${upstreamPath}${url.search}`;

  // Reenviamos headers
  const inHeaders = new Headers(request.headers);
  inHeaders.delete('host');

  // Importante: algunos orígenes exigen referer y origin
  const siteOrigin = url.origin; // p.ej. https://delsutv.netlify.app
  inHeaders.set('referer', siteOrigin + '/');
  inHeaders.set('origin', siteOrigin);

  // User-Agent de navegador (algunos CDNs bloquean UAs "raros")
  inHeaders.set(
    'user-agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36'
  );

  // Rango para segmentos .ts
  const range = request.headers.get('range');
  if (range) inHeaders.set('range', range);

  const resp = await fetch(upstream, {
    method: request.method,
    headers: inHeaders,
    redirect: 'follow',
  });

  // Copiamos headers del upstream y añadimos CORS
  const out = new Headers(resp.headers);
  addCors(out);
  out.set('x-proxy-target', upstream);
  out.set('x-proxy-status', String(resp.status));

  return new Response(resp.body, {
    status: resp.status,
    headers: out,
  });
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

