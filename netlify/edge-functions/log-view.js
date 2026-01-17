// netlify/edge-functions/log-view.js
const JSON_HEADERS = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export default async (request, context) => {
  try {
    // Preflight CORS
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

    // Geo de Netlify (Edge)
    const geo = context?.geo || {};
    const countryCode = (geo.country?.code || "UN").toUpperCase();
    const countryName = geo.country?.name || "Unknown";

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing supabase env" }),
        { status: 500, headers: JSON_HEADERS }
      );
    }

    // 🔒 Llamada única al RPC atómico (INSERT ON CONFLICT DO UPDATE … +1)
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
        p_country_code: countryCode,
        p_country_name: countryName,
      }),
    });

    if (!(rpcRes.status >= 200 && rpcRes.status < 300)) {
      const errTxt = await rpcRes.text();
      return new Response(
        JSON.stringify({ ok: false, error: "rpc_failed", detail: errTxt }),
        { status: 500, headers: JSON_HEADERS }
      );
    }

    // ✅ Éxito
    return new Response(
      JSON.stringify({
        ok: true,
        geo: { countryCode, countryName },
      }),
      { headers: JSON_HEADERS }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || String(e) }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};
