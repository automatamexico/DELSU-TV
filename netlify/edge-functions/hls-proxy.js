// netlify/edge-functions/hls-proxy.js
// Proxea /hls/* -> https://2-fss-2.streamhoster.com/* y añade CORS.

export default async (request, context) => {
  const url = new URL(request.url);

  // Ruta solicitada: /hls/pl_118/206.../chunklist.m3u8
  const upstreamPath = url.pathname.replace(/^\/hls\//, ""); // pl_118/206.../chunklist.m3u8
  const upstream = `https://2-fss-2.streamhoster.com/${upstreamPath}${url.search}`;

  // Reenvía método y cabeceras útiles (Range para .ts)
  const headers = new Headers(request.headers);
  headers.delete("host"); // evitar conflictos

  // (Opcional) Si tu proveedor requiere un 'referer' concreto, puedes setearlo aquí:
  // headers.set("referer", "https://tusitio.netlify.app/");

  const resp = await fetch(upstream, {
    method: request.method,
    headers,
  });

  // Copiamos headers y añadimos CORS
  const outHeaders = new Headers(resp.headers);
  outHeaders.set("access-control-allow-origin", "*");
  outHeaders.set("access-control-allow-credentials", "false");
  outHeaders.set("access-control-allow-headers", "origin,range,accept,content-type");
  outHeaders.set("access-control-allow-methods", "GET,HEAD,OPTIONS");

  // Responder cuerpo en streaming (playlist o .ts)
  return new Response(resp.body, { status: resp.status, headers: outHeaders });
};

// En Edge Functions modernas no necesitas export config si usas netlify.toml con path
