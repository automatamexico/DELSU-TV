// netlify/functions/channel-geo.js
// Lambda (Node) que devuelve vistas por país DESDE channel_views_geo,
// para que el MAPA pinte los mismos países/valores/colores que la barra.

const ALLOW_ORIGIN = "*"; // si quieres, cámbialo por tu dominio

function colorByCount(c) {
  const n = Number(c) || 0;
  if (n <= 0) return "#6b7280";   // gris
  if (n <= 3) return "#ef4444";   // 1–3 (rojo)
  if (n <= 10) return "#22c55e";  // 4–10 (verde)
  if (n <= 50) return "#f59e0b";  // 11–50 (amarillo)
  return "#ec4899";               // 51+
}

function getParam(event, ...keys) {
  const qs = event.queryStringParameters || {};
  for (const k of keys) {
    const v = (qs[k] || "").trim();
    if (v) return v;
  }
  return "";
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": ALLOW_ORIGIN,
      "cache-control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "access-control-allow-origin": ALLOW_ORIGIN,
        "access-control-allow-methods": "GET,OPTIONS",
        "access-control-allow-headers": "content-type, authorization",
      },
      body: "",
    };
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return response(500, { error: "Missing Supabase env vars" });
    }

    const channelId = getParam(event, "channel_id", "channelId", "id", "cid");
    if (!channelId) return response(400, { error: "channel_id is required" });

    // Leemos TODOS los países del canal (sin límite) de channel_views_geo
    const qs = new URLSearchParams({
      select: "country_code,country_name,views_count",
      "channel_id": `eq.${channelId}`,
      order: "views_count.desc.nullslast",
    });
    const url = `${SUPABASE_URL}/rest/v1/channel_views_geo?${qs.toString()}`;

    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Prefer: "count=exact",
      },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return response(res.status, { error: "supabase_rest_error", details: txt });
    }

    const rows = await res.json(); // [{country_code,country_name,views_count}, ...]
    const countries = (Array.isArray(rows) ? rows : []).map((r) => {
      const count = Number(r.views_count || 0);
      const code = String(r.country_code || "").toUpperCase();
      const name = r.country_name || r.country_code || "—";
      return {
        code,               // ISO-2 para el mapa
        name,               // nombre para tooltip
        count,              // compat
        value: count,       // muchos mapas esperan 'value'
        fill: colorByCount(count),
      };
    });

    // También devolvemos 'byCountry' para compatibilidad con la barra
    const byCountry = countries.map(({ name, count }) => ({ country_name: name, count }));

    const total = countries.reduce((s, x) => s + (x.count || 0), 0);

    return response(200, {
      countries,           // ← el mapa debe usar esto
      byCountry,           // ← la barra también lo entiende
      meta: { channel_id: channelId, total, countries_count: countries.length, source: "channel_views_geo" },
    });
  } catch (e) {
    return response(500, { error: "unexpected", message: e?.message || String(e) });
  }
};
