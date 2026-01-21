// netlify/functions/hls-http.js
export async function handler(event) {
  try {
    // /hls-http/<host[:port]>/<path...>  -> http://<host[:port]>/<path...>
    const u = event.queryStringParameters?.u || "";
    if (!u) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, error: "missing u" }),
      };
    }

    // Asegura http:// y decodifica cualquier %3A del puerto
    const raw = decodeURIComponent(u);
    const target = raw.startsWith("http://") || raw.startsWith("https://")
      ? raw
      : `http://${raw}`;

    const url = new URL(target);

    // Construye cabeceras “amigables” para orígenes viejos
    const fwdHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      "Accept": "*/*",
      "Origin": "null",            // algunos orígenes fallan si hay origin https
      "Referer": "",
      "Host": url.host,            // mantiene Host del origen (incluye :8081)
      "Connection": "keep-alive",
    };

    // Soporta Range si el player lo pide
    const incomingRange = event.headers?.range || event.headers?.Range;
    if (incomingRange) fwdHeaders["Range"] = incomingRange;

    // Sigue redirecciones del origen
    const resp = await fetch(target, {
      method: "GET",
      headers: fwdHeaders,
      redirect: "follow",
    });

    const buf = await resp.arrayBuffer();

    // Propaga el content-type correcto (m3u8 / ts / aac, etc.)
    const ct =
      resp.headers.get("content-type") ||
      (target.endsWith(".m3u8")
        ? "application/vnd.apple.mpegurl"
        : "video/mp2t");

    const outHeaders = {
      "content-type": ct,
      // evita cache agresivo en edge mientras pruebas
      "cache-control": "no-store, must-revalidate",
      // CORS seguro (mismo origen de tu app)
      "access-control-allow-origin": "*",
    };

    // Si hay rango parcial, propaga códigos/headers de rango
    const status =
      resp.status === 206 || incomingRange ? 206 : resp.status || 200;

    const cl = resp.headers.get("content-length");
    if (cl) outHeaders["content-length"] = cl;

    const cr = resp.headers.get("content-range");
    if (cr) outHeaders["content-range"] = cr;

    return {
      statusCode: status,
      headers: outHeaders,
      body: Buffer.from(buf).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: String(e) }),
    };
  }
}
