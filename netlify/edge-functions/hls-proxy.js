// netlify/edge-functions/hls-proxy.js
// Proxy HLS con cabeceras anti-hotlink y tipos correctos

const SITE = 'https://delsutv.netlify.app';

export default async (request, context) => {
  try {
    // /hls/<host>/<path>...  -> https://<host>/<path>...
    const url = new URL(request.url);
    let upstream = url.pathname.replace(/^\/hls\//, '');

    // Permite que vengan rutas que ya incluyan protocolo
    if (!/^https?:\/\//i.test(upstream)) {
      upstream = 'https://' + upstream;
    }

    // Seguridad básica
    const target = new URL(upstream);
    if (!['http:', 'https:'].includes(target.protocol)) {
      return new Response('Bad protocol', { status: 400 });
    }

    // Cabeceras que piden algunos orígenes (anti-hotlink)
    const reqHeaders = new Headers(request.headers);
    reqHeaders.set('Referer', SITE);
    reqHeaders.set('Origin', SITE);
    reqHeaders.set(
      'User-Agent',
      reqHeaders.get('User-Agent') ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari'
    );
    // Asegura que aceptamos playlists HLS
    reqHeaders.set(
      'Accept',
      'application/vnd.apple.mpegurl,application/x-mpegURL,*/*;q=0.1'
    );

    // Petición al origen
    const upstreamResp = await fetch(target.toString(), {
      method: request.method,
      headers: reqHeaders,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'follow',
      // Evita que el edge guarde respuestas viejas si el upstream prohíbe cache
      cache: 'no-store',
    });

    // Si falla, devuelve el status real (mejor para ver el motivo en DevTools)
    if (!upstreamResp.ok) {
      const text = await upstreamResp.text().catch(() => '');
      return new Response(
        `Upstream ${upstreamResp.status} ${upstreamResp.statusText}\n${text.slice(0, 512)}`,
        {
          status: upstreamResp.status,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Access-Control-Allow-Origin': SITE,
          },
        }
      );
    }

    // Copia body y cabeceras
    const respHeaders = new Headers(upstreamResp.headers);

    // Normaliza tipos para que Hls.js no falle si el origen envía text/plain
    const pathname = target.pathname.toLowerCase();
    if (pathname.endsWith('.m3u8')) {
      respHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (pathname.endsWith('.mpd')) {
      respHeaders.set('Content-Type', 'application/dash+xml');
    } else if (pathname.endsWith('.ts') || pathname.endsWith('.aac')) {
      respHeaders.set('Content-Type', 'video/mp2t');
    }

    // Abre CORS para tu sitio
    respHeaders.set('Access-Control-Allow-Origin', SITE);
    respHeaders.set('Access-Control-Allow-Credentials', 'true');

    // Cache cortito para segmentos; casi nada para playlists
    if (pathname.endsWith('.m3u8')) {
      respHeaders.set('Cache-Control', 'no-store, max-age=0');
    } else {
      respHeaders.set('Cache-Control', 'public, max-age=30');
    }

    return new Response(upstreamResp.body, {
      status: 200,
      headers: respHeaders,
    });
  } catch (err) {
    return new Response(`Proxy error: ${err?.message || err}`, {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
};

export const config = { path: '/hls/*' };



