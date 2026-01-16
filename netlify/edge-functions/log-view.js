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

    // 2) Geo de Netlify (Edge) — NO LLAMAMOS a nada externo
    const geo = context?.geo || {};
    const countryCode = (geo.country?.code || "UN").toUpperCase();
    const countryName = geo.country?.name || "Unknown";

    // 3) Upsert en Supabase con SERVICE KEY (segura en Edge)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "missing supabase env" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    // Usamos PostgREST: upsert incrementando el contador (views_count)
    // Estrategia: intentar update (+1); si no existe, insert con 1.
    const table = "channel_views_geo";
    const now = new Date().toISOString();

    // UPDATE (sumar 1)
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?channel_id=eq.${channelId}&country_code=eq.${countryCode}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          views_count: { increment: 1 },
          country_name: countryName,
          last_viewed_at: now,
        }),
      },
    );

    if (updateRes.status === 200) {
      const upd = await updateRes.json();
      if (Array.isArray(upd) && upd.length > 0) {
        return new Response(JSON.stringify({ ok: true, updated: true, geo: { countryCode, countryName } }), {
          headers: { "content-type": "application/json" },
        });
      }
    }

    // INSERT (no existía fila)
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify([{
        channel_id: channelId,
        country_code: countryCode,
        country_name: countryName,
        views_count: 1,
        last_viewed_at: now,
      }]),
    });

    if (insertRes.status >= 200 && insertRes.status < 300) {
      return new Response(JSON.stringify({ ok: true, inserted: true, geo: { countryCode, countryName } }), {
        headers: { "content-type": "application/json" },
      });
    }

    const errTxt = await insertRes.text();
    return new Response(JSON.stringify({ ok: false, error: "insert_failed", detail: errTxt }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
