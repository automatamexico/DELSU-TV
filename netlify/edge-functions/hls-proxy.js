// netlify/edge-functions/hls-proxy.js
// Proxy universal: /hls/https/<host>/<path>  ->  https://<host>/<path>
// (y mantiene compat: /hls/<path> -> https://2-fss-2.streamhoster.com/<path>)
export default async (request) => {
  const url = new URL(request.url);

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const path = url.pathname.replace(/^\/hls\//, '');

  // ¿Viene con esquema/host?  /hls/https/<host>/<resto>
  // m[1]=https|http, m[2]=host, m[3]=resto de la ruta
  const m = path.match(/^(https?)\/([^/]+)\/(.*)$/);
  let upstream, extPath;
  if (m) {
    const [, scheme, host, rest] = m;
    upstream = `${scheme}://${host}/${rest}${url.search || ''}`;
    extPath = rest;
  } else {
    // compat: viejo formato /hls/<path> -> host por defecto
    upstream = `https://2-fss-2.streamhoster.com/${path}${url.search || ''}`;
    extPath = path;
  }

  // Reenviar cabeceras útiles
  const inHeaders = new Headers(request.headers);
  inHeaders.delete('host');

  // Muchos CDNs exigen referer/origin “válidos”
  const siteOrigin = url.origin; // p.ej. https://delsutv.netlify.app
  inHeaders.set('referer', siteOrigin + '/');
  inHeaders.set('origin', siteOrigin);

  // User-Agent de navegador
  inHeaders.set(
    'user-agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36'
  );

  // Soporta Range (segmentos .ts)
  const range = request.headers.get('range');
  if (range) inHeaders.set('range', range);

  const resp = await fetch(upstream, {
    method: request.method,
    headers: inHeaders,
    redirect: 'follow',
  });

  const headers = new Headers(resp.headers);
  addCors(headers);

  // Corrige Content-Type si el upstream lo manda mal
  const lower = (extPath || '').toLowerCase();
  if (lower.endsWith('.m3u8')) {
    headers.set('content-type', 'application/vnd.apple.mpegurl');
  } else if (lower.endsWith('.ts')) {
    headers.set('content-type', 'video/mp2t');
  }

  // Útil para depurar en Network
  headers.set('x-proxy-target', upstream);
  headers.set('x-proxy-status', String(resp.status));

  return new Response(resp.body, { status: resp.status, headers });
};

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-credentials': 'false',
    'access-control-allow-headers': 'origin,range,accept,content-type',
    'access-control-allow-methods': 'GET,HEAD,OPTIONS',
  };
}
function addCors(h) {
  const ch = corsHeaders();
  for (const k in ch) h.set(k, ch[k]);
}


