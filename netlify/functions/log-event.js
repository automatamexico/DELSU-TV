// netlify/functions/log-event.js
// Registra analytics en Supabase con país "sí o sí" (server-side)

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // 👈 OJO: SERVICE ROLE, no ANON

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY" }),
      };
    }

    const body = JSON.parse(event.body || "{}");

    // ✅ País "sí o sí": Netlify Geo headers
    const h = event.headers || {};
    const country =
      (h["x-nf-country"] ||
        h["X-NF-Country"] ||
        h["cf-ipcountry"] ||
        h["CF-IPCountry"] ||
        h["x-vercel-ip-country"] ||
        h["X-Vercel-IP-Country"] ||
        "UN") // UN = Unknown
        .toString()
        .trim()
        .toUpperCase();

    // Puedes guardar IP si quieres (opcional). A veces viene en x-forwarded-for.
    const xff = (h["x-forwarded-for"] || h["X-Forwarded-For"] || "").toString();
    const ip = xff.split(",")[0].trim() || null;

    // ✅ Sanitiza y limita (blindaje básico)
    const event_type = body.event_type === "play" ? "play" : "page_view";
    const page_path = typeof body.page_path === "string" ? body.page_path.slice(0, 300) : null;
    const channel_id = typeof body.channel_id === "string" ? body.channel_id : null;
    const session_id = typeof body.session_id === "string" ? body.session_id.slice(0, 80) : null;

    const user_agent = (h["user-agent"] || h["User-Agent"] || "").toString().slice(0, 300);

    const payload = {
      event_type,
      page_path,
      channel_id,
      country,
      session_id,
      user_agent,
      // ip, // <- si quieres guardar IP, agrega columna ip en tabla. Si no, déjalo comentado.
    };

    // Insert con Service Role (bypassa RLS)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { statusCode: 500, body: JSON.stringify({ error: "Supabase insert failed", detail: text }) };
    }

    return { statusCode: 204, body: "" };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};
