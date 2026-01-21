// netlify/functions/channel-geo.js
const JSON_HEADERS = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
};

export default async (request) => {
  try {
    const url = new URL(request.url);
    const channelId = url.searchParams.get("channel_id");
    if (!channelId) {
      return new Response(JSON.stringify({ ok:false, error:"missing channel_id" }), { status:400, headers: JSON_HEADERS });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const KEY = Deno.env.get("SUPABASE_SERVICE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !KEY) {
      return new Response(JSON.stringify({ ok:false, error:"missing supabase env" }), { status:500, headers: JSON_HEADERS });
    }

    // Lee la tabla agregada por país (trae el código ISO-2)
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/channel_views_geo?channel_id=eq.${channelId}` +
      `&select=country_name,country_code,views_count`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
    );

    if (!resp.ok) {
      const detail = await resp.text();
      return new Response(JSON.stringify({ ok:false, error:"supabase_error", detail }), { status:500, headers: JSON_HEADERS });
    }

    const rows = await resp.json();

    // Normaliza y ordena
    const byCountry = (rows || [])
      .map(r => ({
        country_name: r.country_name || "",
        country_code: (r.country_code || "").toUpperCase(),
        count: Number(r.views_count || 0),
      }))
      .filter(r => r.country_name)      // evita vacíos
      .sort((a,b) => b.count - a.count);

    // (Opcional) fallback por si algún nombre vino sin code
    const NAME_TO_CODE = {
      "MEXICO": "MX",
      "UNITED STATES": "US",
      "SINGAPORE": "SG",
      "COSTA RICA": "CR",
      "ARGENTINA": "AR",
      "LATVIA": "LV",
    };
    for (const r of byCountry) {
      if (!r.country_code) {
        const k = r.country_name.trim().toUpperCase();
        r.country_code = NAME_TO_CODE[k] || "";
      }
    }

    return new Response(
      JSON.stringify({ ok:true, byCountry, countries: byCountry }),
      { headers: JSON_HEADERS }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: e?.message || String(e) }), { status:500, headers: JSON_HEADERS });
  }
};
