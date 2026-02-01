// netlify/functions/hls-http.js
// HLS proxy + playlist rewriter
//
// Why this exists:
// Some HLS providers allow playback when you paste the .m3u8 in a browser tab,
// but they block XHR/fetch requests from arbitrary Origins (CORS). hls.js uses
// XHR/fetch to load the manifest + segments, so the same stream can fail inside
// your site.
//
// This function proxies the request and (if the response is a .m3u8 playlist)
// rewrites ALL nested URIs (variants/segments/keys) so *every* subsequent request
// also goes through this proxy.

function isAbsUrl(s) {
  return /^https?:\/\//i.test(s);
}

function proxify(absUrl) {
  // Matches your netlify.toml redirect:
  // /hls-http/*  -> /.netlify/functions/hls-http?u=:splat
  return `/hls-http/${encodeURIComponent(absUrl)}`;
}

function resolveUrl(base, maybeRelative) {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return maybeRelative;
  }
}

function rewriteM3U8(text, baseUrl) {
  const lines = String(text || '').split(/\r?\n/);
  const out = [];

  for (let line of lines) {
    const raw = line;
    line = line.trim();
    if (!line) {
      out.push(raw);
      continue;
    }

    // Rewrite EXT-X-KEY URI="..."
    if (line.startsWith('#EXT-X-KEY') && line.includes('URI="')) {
      out.push(
        raw.replace(/URI="([^"]+)"/g, (_m, uri) => {
          const abs = isAbsUrl(uri) ? uri : resolveUrl(baseUrl, uri);
          return `URI="${proxify(abs)}"`;
        })
      );
      continue;
    }

    // Comments stay as-is
    if (line.startsWith('#')) {
      out.push(raw);
      continue;
    }

    // Any non-comment line in m3u8 is a URI (variant or segment)
    const abs = isAbsUrl(line) ? line : resolveUrl(baseUrl, line);
    out.push(proxify(abs));
  }

  return out.join('\n');
}

export async function handler(event) {
  try {
    const u = event.queryStringParameters?.u;
    if (!u) {
      return { statusCode: 400, body: 'Missing u' };
    }

    // Decode target
    const targetUrl = decodeURIComponent(u);

    // Forward some headers (helps some CDNs)
    const inHeaders = event.headers || {};
    const range = inHeaders.range || inHeaders.Range;

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        ...(range ? { Range: range } : {}),
        // A permissive UA helps with picky origins
        'User-Agent': inHeaders['user-agent'] || inHeaders['User-Agent'] || 'Mozilla/5.0',
        'Accept': inHeaders.accept || inHeaders.Accept || '*/*',
        'Accept-Language': inHeaders['accept-language'] || inHeaders['Accept-Language'] || 'es-MX,es;q=0.9,en;q=0.8',
        // Some vendors validate referer/origin — keep it simple
        'Referer': targetUrl,
        'Origin': new URL(targetUrl).origin,
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const isM3U8 = /application\/(vnd\.apple\.mpegurl|x-mpegURL)/i.test(contentType) || /\.m3u8($|\?)/i.test(targetUrl);

    // Read body
    const bodyBuf = Buffer.from(await res.arrayBuffer());

    // If playlist: rewrite nested URIs
    if (isM3U8) {
      const text = bodyBuf.toString('utf8');
      const rewritten = rewriteM3U8(text, targetUrl);

      return {
        statusCode: res.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
          'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
          'Cache-Control': 'no-store, max-age=0',
        },
        body: rewritten,
      };
    }

    // Non-playlist: return raw
    return {
      statusCode: res.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
        'Content-Type': contentType || 'application/octet-stream',
        ...(range ? { 'Accept-Ranges': 'bytes' } : {}),
        'Cache-Control': 'no-store, max-age=0',
      },
      body: bodyBuf.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: `Proxy error: ${err?.message || String(err)}`,
    };
  }
}
