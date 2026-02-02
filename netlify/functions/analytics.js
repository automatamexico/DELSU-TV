// netlify/functions/analytics.js
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

function safeStr(v, max = 40) {
  return (v || "").toString().trim().slice(0, max);
}

function bucketSql(period) {
  // Devuelve expresión SQL para agrupar por periodo
  // Usamos date_trunc en UTC
  if (period === "day") return "date_trunc('day', created_at)";
  if (period === "week") return "date_trunc('week', created_at)";
  if (period === "month") return "date_trunc('month', created_at)";
  return "date_trunc('year', created_at)";
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

    // ✅ Blindaje: SOLO admin (Supabase Auth + user_profiles.role=admin)
    const auth = event.headers.authorization || event.headers.Authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return json(401, { ok: false, error: "Missing Bearer token" });

    const uRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_KEY },
    });
    if (!uRes.ok) return json(401, { ok: false, error: "Invalid session" });
    const u = await uRes.json();
    const uid = u?.id;
    if (!uid) return json(401, { ok: false, error: "No user id" });

    const profRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_profiles?select=role&id=eq.${uid}&limit=1`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      }
    );
    if (!profRes.ok) return json(403, { ok: false, error: "Profile lookup failed" });
    const prof = await profRes.json();
    const role = prof?.[0]?.role || "user";
    if (role !== "admin") return json(403, { ok: false, error: "Not admin" });

    const body = JSON.parse(event.body || "{}");
    const period = ["day", "week", "month", "year"].includes(body.period) ? body.period : "day";
    const event_name = ["page_view", "play"].includes(body.event_name) ? body.event_name : "page_view";
    const country = safeStr(body.country || "ALL", 12).toUpperCase();
    const daysBack = Number.isFinite(body.daysBack) ? Math.max(1, Math.min(3650, body.daysBack)) : (
      period === "day" ? 35 : period === "week" ? 180 : period === "month" ? 540 : 3650
    );

    // Query SQL (via PostgREST RPC? No: aquí hacemos "group" usando /rest con select no sirve bien)
    // Solución simple y robusta: usar un endpoint SQL (rpc) ... pero para no pedirte crear RPC,
    // hacemos agregación desde Node trayendo filas limitadas y agrupando aquí.
    // Para que no truene, limitamos filas por ventana de tiempo.
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    let url = `${SUPABASE_URL}/rest/v1/analytics_events?select=created_at,country&event_name=eq.${event_name}&created_at=gte.${encodeURIComponent(since)}&order=created_at.asc&limit=50000`;
    if (country !== "ALL") url += `&country=eq.${encodeURIComponent(country)}`;

    const rowsRes = await fetch(url, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    });
    if (!rowsRes.ok) {
      const t = await rowsRes.text();
      return json(500, { ok: false, error: "Fetch rows failed", details: t.slice(0, 1000) });
    }
    const rows = await rowsRes.json();

    // Agrupar SI O SI por país + periodo
    const map = new Map(); // key: period|country => count
    const trunc = (dt) => {
      const d = new Date(dt);
      if (Number.isNaN(d.getTime())) return null;
      // normalizamos a etiqueta
      const pad2 = (n) => String(n).padStart(2, "0");
      if (period === "day") return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth()+1)}-${pad2(d.getUTCDate())}`;
      if (period === "month") return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth()+1)}`;
      if (period === "year") return `${d.getUTCFullYear()}`;
      // week ISO aproximado (UTC)
      const temp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const dayNum = temp.getUTCDay() || 7;
      temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);
      return `${temp.getUTCFullYear()}-W${pad2(weekNo)}`;
    };

    for (const r of rows) {
      const p = trunc(r.created_at);
      if (!p) continue;
      const c = (r.country || "XX").toString().toUpperCase().slice(0, 8);
      const key = `${p}||${c}`;
      map.set(key, (map.get(key) || 0) + 1);
    }

    const out = Array.from(map.entries()).map(([k, count]) => {
      const [p, c] = k.split("||");
      return { period: p, country: c, count };
    });

    // ordenar: periodo asc, count desc dentro del periodo
    out.sort((a, b) => (a.period === b.period ? b.count - a.count : a.period.localeCompare(b.period)));

    // países disponibles (del set)
    const countries = Array.from(new Set(["ALL", ...rows.map(r => (r.country || "XX").toString().toUpperCase().slice(0,8))])).sort();

    return json(200, {
      ok: true,
      meta: { period, event_name, country, since, rows: rows.length },
      countries,
      data: out,
    });
  } catch (e) {
    return json(500, { ok: false, error: e.message || String(e) });
  }
};
