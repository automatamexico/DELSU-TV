// netlify/functions/analytics-event.js
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "content-type, x-requested-with, authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  },
  body: JSON.stringify(body),
});

const ok = (body) => json(200, { ok: true, ...body });
const bad = (msg, code = 400, extra = {}) => json(code, { ok: false, error: msg, ...extra });

function safeParse(body) {
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    return {};
  }
}

function clampStr(v, max = 300) {
  const s = (v ?? "").toString().trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function isUUID(v) {
  const s = (v ?? "").toString().trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function getHeader(headers, name) {
  if (!headers) return "";
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : "";
}

function extractCountry(headers) {
  // Netlify / Cloudflare / varios (por si cambia el proveedor o el edge)
  const candidates = [
    getHeader(headers, "x-nf-country"),      // Netlify (muy común)
    getHeader(headers, "x-nf-geo"),          // Netlify (a veces JSON)
    getHeader(headers, "cf-ipcountry"),      // Cloudflare
    getHeader(headers, "x-country-code"),
    getHeader(headers, "x-vercel-ip-country"),
    getHeader(headers, "x-appengine-country"),
  ].filter(Boolean);

  for (const c of candidates) {
    const v = String(c).trim();

    // Caso x-nf-geo: puede venir JSON
    if (v.startsWith("{") && v.endsWith("}")) {
      try {
        const j = JSON.parse(v);
        const code =
          (j && (j.country && String(j.country)) ) ||
          (j && (j.country_code && String(j.country_code))) ||
          "";
        if (/^[a-z]{2}$/i.test(code)) return code.toUpperCase();
      } catch {}
    }

    // Caso simple: "MX"
    if (/^[a-z]{2}$/i.test(v)) return v.toUpperCase();
  }

  return null;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return json(200, { ok: true });
    }

    if (event.httpMethod !== "POST") {
      return bad("Method not allowed", 405);
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return bad("Faltan env vars SUPABASE_URL / SUPABASE_SERVICE_KEY", 500);
    }

    const body = safeParse(event.body);

    // ✅ Solo aceptamos estos eventos
    const event_type = clampStr(body.event_type, 20);
    if (!event_type || !["page_view", "play"].includes(event_type)) {
      return bad("event_type inválido. Usa: page_view | play");
    }

    // page_path (para page_view)
    const page_path = clampStr(body.page_path, 300);

    // channel_id (solo si es play)
    let channel_id = null;
    if (event_type === "play") {
      const cid = body.channel_id;
      if (cid && isUUID(cid)) channel_id = String(cid).trim();
      // si no viene, lo dejamos null (no rompas tu app por eso)
    }

    // session_id (ideal para “personas únicas”)
    const session_id = clampStr(body.session_id, 120);

    // user_agent (para debug / antispam básico)
    const user_agent = clampStr(
      body.user_agent || getHeader(event.headers, "user-agent"),
      400
    );

    // ✅ País: lo detectamos del edge. Si no existe, dejamos NULL (tu reader lo mostrará como "Desconocido")
    const country = extractCountry(event.headers);

    const payload = {
      event_type,
      page_path: page_path || null,
      channel_id,
      country: country || null,
      session_id: session_id || null,
      user_agent: user_agent || null,
      // user_id lo puedes llenar después si algún día quieres ligar a auth
      // user_id: null,
    };

    const { error } = await sb.from("analytics_events").insert([payload]);
    if (error) return bad(error.message, 500);

    return ok({ saved: true, country: country || null });
  } catch (e) {
    return bad(e.message || String(e), 500);
  }
};
