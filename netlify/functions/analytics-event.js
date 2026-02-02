// netlify/functions/analytics-event.js
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

function getCountryFromNetlify(req) {
  // Netlify suele mandar geodata en varios headers según edge/CDN.
  // Probamos varios para que sea "blindado".
  const h = req.headers || {};
  const country =
    h["x-nf-country"] ||
    h["x-country"] ||
    h["cf-ipcountry"] ||
    h["x-vercel-ip-country"] ||
    null;

  // A veces Netlify manda un JSON en x-nf-geo
  if (!country && h["x-nf-geo"]) {
    try {
      const geo = JSON.parse(h["x-nf-geo"]);
      if (geo && geo.country) return String(geo.country).toUpperCase();
    } catch {}
  }

  return country ? String(country).toUpperCase() : null;
}

function safeText(v, max = 500) {
  if (v === null || v === undefined) return null;
  return String(v).slice(0, max);
}

exports.handler = async (event) => {
  // CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type, authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const event_type = body?.event_type;

    if (!["page_view", "play"].includes(event_type)) {
      return { statusCode: 400, body: "Invalid event_type" };
    }

    const page_path = safeText(body?.page_path || null, 300);
    const channel_id = body?.channel_id || null; // uuid string
    const session_id = safeText(body?.session_id || null, 120);
    const user_agent = safeText(event.headers["user-agent"] || null, 400);

    // País "sí o sí" (si Netlify no lo manda, queda NULL, pero en producción normalmente llega)
    const country = getCountryFromNetlify({ headers: Object.fromEntries(Object.entries(event.headers || {}).map(([k,v]) => [k.toLowerCase(), v])) });

    // user_id opcional si el cliente lo manda (para admin no es necesario)
    const user_id = body?.user_id || null;

    // Reglas mínimas: play debe traer channel_id
    if (event_type === "play" && !channel_id) {
      return { statusCode: 400, body: "play requires channel_id" };
    }

    const { error } = await supabaseAdmin.from("analytics_events").insert([
      {
        event_type,
        page_path,
        channel_id,
        country,
        session_id,
        user_id,
        user_agent,
      },
    ]);

    if (error) {
      return { statusCode: 500, body: `DB error: ${error.message}` };
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "content-type": "application/json",
      },
      body: JSON.stringify({ ok: true, country }),
    };
  } catch (e) {
    return { statusCode: 500, body: `Server error: ${e.message || String(e)}` };
  }
};
