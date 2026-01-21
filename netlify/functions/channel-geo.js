// netlify/functions/channel-geo.js
const JSON_HEADERS = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
};

const env = (k) => {
  // Edge: Deno.env.get ; Functions: process.env
  try {
    if (typeof Deno !== "undefined" && Deno?.env?.get) return Deno.env.get(k);
  } catch {}
  return (typeof process !== "undefined" && process?.env?.[k]) || "";
};

export default async (request) => {
  const safeError = (status, msg, detail) =>
    new Response(
      JSON.stringify({
        ok: false,
        error: msg,
        detail,
        byCountry: [],
        countries: [],
      }),
      { status, headers: JSON_HEADERS }
    );

  try {
    const url = new URL(request.url);
    const channelId = url.searchParams.get("channel_id");
    if (!channelId) return safeError(400, "missing channel_id");

    const SUPABASE_URL = env("SUPABASE_URL");
    const KEY = env("SUPABASE_SERVICE_KEY") || env("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !KEY) return safeError(500, "missing supabase env");

    const endpoint =
      `${SUPABASE_URL}/rest/v1/channel_views_geo` +
      `?channel_id=eq.${encodeURIComponent(channelId)}` +
      `&select=country_name,country_code,views_count`;

    const resp = await fetch(endpoint, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        Accept: "application/json",
        Prefer: "return=representation",
      },
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return safeError(500, "supabase_error", detail);
    }

    const rows = await resp.json();

    const NAME_TO_CODE = {
      "MEXICO": "MX",
      "UNITED STATES": "US",
      "SINGAPORE": "SG",
      "COSTA RICA": "CR",
      "ARGENTINA": "AR",
      "LATVIA": "LV",
    };

    const byCountry = (rows || [])
      .map((r) => {
        const name = String(r.country_name || "").trim();
        let code = String(r.country_code || "").trim().toUpperCase();
        if (!code && name) {
          const k = name.toUpperCase();
          if (NAME_TO_CODE[k]) code = NAME_TO_CODE[k];
        }
        return {
          country_name: name,
          country_code: code,
          count: Number(r.views_count || 0),
        };
      })
      .filter((r) => r.country_name)
      .sort((a, b) => b.count - a.count);

    return new Response(
      JSON.stringify({ ok: true, byCountry, countries: byCountry }),
      { headers: JSON_HEADERS }
    );
  } catch (e) {
    return safeError(500, "unhandled_error", e?.message || String(e));
  }
};
