// netlify/edge-functions/log-view.js
const JSON_HEADERS = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};

// Normalización de países: corrige códigos no estándar y territorios
const TERRITORY_TO_PARENT = {
  // Territorios de EE. UU. → US
  PR: "US", GU: "US", VI: "US", AS: "US", MP: "US", UM: "US",
  // Sinónimo común de GB
  UK: "GB",
};

const CANONICAL_NAME = {
  US: "United States of America",
  GB: "United Kingdom",
  MX: "Mexico",
  AR: "Argentina",
  CR: "Costa Rica",
  SG: "Singapore",
  // agrega otros si lo deseas; por defecto usaremos el de Netlify
};

function normalizeCountry(geo) {
  // Netlify Edge da iso2 en geo.country.code (a veces UK u otros)
  const rawCode = (geo?.country?.code || "UN").toUpperCase();
  const code = TERRITORY_TO_PARENT[rawCode] || rawCode;

  // Si tenemos un nombre canónico, úsalo; si no, cae al de Netlify
  const name =
    CANONICAL_NAME[code] ||
    geo?.country?.name ||
    "Unknown";

  return { code, name };
}

export default async (request, context) => {
  try {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    const url = new URL(request.url);
    const channelId = url.searchParams.get("channel_id");
    if (!channelId) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing channel_id" }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    // ✅ Geo normalizado (corrige UK→GB y territorios → país padre)
    const { code: countryCode, name: countryName } = normalizeCountry(context?.geo);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing supabase env" }),
        { status: 500, headers: JSON_HEADERS }
      );
    }

    // RPC atómico: incrementa (INSERT … ON CONFLICT … +1)
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_geo_view`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        p_channel_id: channelId,
        p_country_code: countryCode, // ISO-2 consistente (US, MX, AR, GB…)
        p_country_name: countryName, // Nombre canónico estable
      }),
    });

    if (!(rpcRes.status >= 200 && rpcRes.status < 300)) {
      const errTxt = await rpcRes.text();
      return new Response(
        JSON.stringify({ ok: false, error: "rpc_failed", detail: errTxt }),
        { status: 500, headers: JSON_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, geo: { countryCode, countryName } }),
      { headers: JSON_HEADERS }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || String(e) }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};
