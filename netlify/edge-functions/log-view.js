// netlify/edge-functions/log-view.js
export default async (request, context) => {
  try {
    // 1) Canal
    const url = new URL(request.url);
    const channelId = url.searchParams.get("channel_id");
    if (!channelId) {
      return new Response(JSON.stringify({ ok: false, error: "missing channel_id" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // 2) Geo de Netlify (Edge)
    const geo = context?.geo || {};
    const countryCode = (geo.country?.code || "UN").toUpperCase();
    const countryName = geo.country?.name || "Unknown";

    // 3) Env para Supabase (service role SOLO en Edge)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "missing supabase env" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    // 4) Llamada al RPC que hace el upsert + incremento
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_channel_view`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        p_channel_id: channelId,
        p_country_code: countryCode,  // ej. "MX"
        p_country_name: countryName,  // ej. "Mexico"
      }),
    });

    if (!rpcRes.ok) {
      const errTxt = await rpcRes.text();
      return new Response(JSON.stringify({ ok: false, error: "rpc_failed", detail: errTxt }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    // 5) OK
    return new Response(
      JSON.stringify({ ok: true, updated: true, geo: { countryCode, countryName } }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
