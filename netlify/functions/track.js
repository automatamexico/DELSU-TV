// netlify/functions/track.js
const crypto = require("crypto");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type, authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json(500, { ok: false, error: "Server env not set (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)" });
    }

    const payload = JSON.parse(event.body || "{}");
    const event_name = (payload.event_name || "").trim();
    const page_path = (payload.page_path || "").toString().slice(0, 300) || null;
    const channel_id = (payload.channel_id || "").toString().slice(0, 120) || null;

    if (!["page_view", "play"].includes(event_name)) {
      return json(400, { ok: false, error: "Invalid event_name" });
    }

    // Netlify geolocation (casi siempre viene)
    const country =
      (event.headers["x-nf-geo-country"] ||
        event.headers["X-Nf-Geo-Country"] ||
        "XX").toString().toUpperCase().slice(0, 8);

    // IP hash (no guardes IP cruda)
    const ip =
      (event.headers["x-forwarded-for"] || event.headers["X-Forwarded-For"] || "")
        .toString()
        .split(",")[0]
        .trim();
    const ip_hash = ip ? crypto.createHash("sha256").update(ip).digest("hex") : null;

    // Si viene auth token (usuario logueado), intentamos sacar user_id
    const auth = event.headers.authorization || event.headers.Authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    let user_id = null;
    if (token) {
      const uRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_KEY },
      });
      if (uRes.ok) {
        const u = await uRes.json();
        user_id = u?.id || null;
      }
    }

    // Insert con service role
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify([
        { event_name, page_path, channel_id, country, ip_hash, user_id },
      ]),
    });

    if (!ins.ok) {
      const t = await ins.text();
      return json(500, { ok: false, error: "Insert failed", details: t.slice(0, 1000) });
    }

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { ok: false, error: e.message || String(e) });
  }
};
