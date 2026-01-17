// netlify/edge-functions/log-view.js
export default async (request, context) => {
  try {
    // ✅ Permitir GET/POST (y devolver OK en OPTIONS para preflight si llega)
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const url = new URL(request.url);
    const channelId = url.searchParams.get("channel_id");
    if (!channelId) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing channel_id" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    // 🌎 Geo de Netlify Edge
    const geo = context?.geo || {};
    const countryCode = (geo.country?.code || "UN").toUpperCase();
    const countryName = geo.country?.name || "Unknown";

    // 🔐 Credenciales seguras (Environment variables en Netlify)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing supabase env" }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const table = "channel_views_geo";
    const headers = {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    // 1) UPDATE: sumar 1 si ya existe la fila para (channel_id, country_code)
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?channel_id=eq.${channelId}&country_code=eq.${countryCode}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          views_count: { increment: 1 },
          country_name: countryName,
          last_viewed_at: now,
        }),
      }
    );

    let geoOk = false;
    if (updateRes.status === 200) {
      const upd = await updateRes.json();
      geoOk = Array.isArray(upd) && upd.length > 0;
    }

    // 2) INSERT si no existía
    if (!geoOk) {
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers,
        body: JSON.stringify([
          {
            channel_id: channelId,
            country_code: countryCode,
            country_name: countryName,
            views_count: 1,
            last_viewed_at: now,
          },
        ]),
      });

      if (!(insertRes.status >= 200 && insertRes.status < 300)) {
        const errTxt = await insertRes.text();
        return new Response(
          JSON.stringify({ ok: false, error: "insert_failed", detail: errTxt }),
          { status: 500, headers: { "content-type": "application/json" } }
        );
      }
    }

    // 3) Mantener sincronía con Home: incrementar channels.views_count
    // (Ignoramos el resultado; si falla no rompemos el flujo)
    await fetch(`${SUPABASE_URL}/rest/v1/channels?id=eq.${channelId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        views_count: { increment: 1 },
        updated_at: now,
      }),
    });

    return new Response(
      JSON.stringify({
        ok: true,
        updated_geo: geoOk,
        inserted_geo: !geoOk,
        geo: { countryCode, countryName },
      }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || String(e) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};
