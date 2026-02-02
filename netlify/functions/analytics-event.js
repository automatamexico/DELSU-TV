// netlify/functions/analytics-event.js
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const ok = (body, statusCode = 200) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify(body),
});

const bad = (message, statusCode = 400, extra = {}) =>
  ok({ ok: false, error: message, ...extra }, statusCode);

const pad2 = (n) => String(n).padStart(2, "0");

function isoWeekKey(date) {
  // ISO week number
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad2(weekNo)}`;
}

function bucketLabel(dtISO, period) {
  const d = new Date(dtISO);
  if (Number.isNaN(d.getTime())) return "—";
  if (period === "day") return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  if (period === "week") return isoWeekKey(d);
  if (period === "month") return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  return `${d.getFullYear()}`;
}

function daysBackByPeriod(period) {
  if (period === "day") return 35;
  if (period === "week") return 180;
  if (period === "month") return 540;
  return 3650;
}

function normalizeCountry(v) {
  const s = (v ?? "").toString().trim();
  if (!s) return "__UNKNOWN__";
  if (/^[a-z]{2}$/i.test(s)) return s.toUpperCase();
  return s;
}

function countryLabel(code) {
  if (code === "ALL") return "ALL";
  if (code === "__UNKNOWN__") return "Desconocido";

  const map = {
    MX: "México",
    US: "Estados Unidos",
    CO: "Colombia",
    ES: "España",
    AR: "Argentina",
    PE: "Perú",
    CL: "Chile",
    EC: "Ecuador",
    GT: "Guatemala",
    HN: "Honduras",
    SV: "El Salvador",
    PA: "Panamá",
    DO: "República Dominicana",
    VE: "Venezuela",
    BR: "Brasil",
    CA: "Canadá",
    BO: "Bolivia",
    CR: "Costa Rica",
    CU: "Cuba",
    NI: "Nicaragua",
    PY: "Paraguay",
    UY: "Uruguay",
    PR: "Puerto Rico",
  };

  if (/^[A-Z]{2}$/.test(code)) {
    return map[code] ? `${map[code]} (${code})` : code;
  }
  return code;
}

exports.handler = async (event) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return bad("Faltan env vars SUPABASE_URL / SUPABASE_SERVICE_KEY", 500);
    }

    const qs = event.queryStringParameters || {};

    const period = (qs.period || "day").toLowerCase(); // day|week|month|year
    const eventType = (qs.event_type || "page_view").toLowerCase(); // page_view|play
    const country = (qs.country || "ALL").trim(); // ALL | MX | __UNKNOWN__ | "Mexico"
    const daysBack = Number(qs.days_back || daysBackByPeriod(period));

    const from = new Date();
    from.setDate(from.getDate() - (Number.isFinite(daysBack) ? daysBack : 35));
    const since = from.toISOString();

    // Traer datos (para series)
    let q = sb
      .from("analytics_events")
      .select("created_at, country, session_id, event_type")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(50000);

    q = q.eq("event_type", eventType);

    // Filtro país (si aplica)
    if (country && country !== "ALL") {
      if (country === "__UNKNOWN__") {
        q = q.or("country.is.null,country.eq.");
      } else {
        q = q.eq("country", country);
      }
    }

    const { data, error } = await q;
    if (error) return bad(error.message, 500);

    const list = Array.isArray(data) ? data : [];

    // Query extra SOLO para construir dropdown completo (sin filtro país)
    const { data: cdata, error: cerr } = await sb
      .from("analytics_events")
      .select("country")
      .gte("created_at", since)
      .eq("event_type", eventType)
      .limit(50000);

    if (cerr) return bad(cerr.message, 500);

    const uniq = new Map();
    uniq.set("ALL", { value: "ALL", label: "ALL" });

    let unknownCount = 0;
    (cdata || []).forEach((r) => {
      const norm = normalizeCountry(r.country);
      if (norm === "__UNKNOWN__") unknownCount++;
      if (!uniq.has(norm)) uniq.set(norm, { value: norm, label: countryLabel(norm) });
    });

    const countriesObjs = Array.from(uniq.values());
    const all = countriesObjs.find((x) => x.value === "ALL");
    const rest = countriesObjs
      .filter((x) => x.value !== "ALL")
      .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));

    const countriesOutObjs = all ? [all, ...rest] : rest;

    // ✅ NUEVO:
    // - countries: strings listos para mostrar (México (MX), Colombia (CO), etc.)
    // - countries_map: mapping label -> value para filtrar sin tocar tu UI (si lo decides luego)
    const countries = countriesOutObjs.map((x) => x.label);
    const countries_map = countriesOutObjs.reduce((acc, x) => {
      acc[x.label] = x.value;
      return acc;
    }, {});

    // Series (agregados)
    const map = new Map();

    if (eventType === "page_view") {
      for (const r of list) {
        const k = bucketLabel(r.created_at, period);
        if (!map.has(k)) map.set(k, new Set());
        const sid = (r.session_id || "").toString().trim();
        map.get(k).add(sid || `__NO_SID__:${r.created_at}:${Math.random()}`);
      }
      const series = Array.from(map.entries()).map(([bucket, set]) => ({
        bucket,
        total: set.size,
      }));
      const total = series.reduce((a, b) => a + (b.total || 0), 0);

      return ok({
        ok: true,
        meta: { period, event_type: eventType, country, since, unknownCount },
        countries,
        countries_map,
        series,
        total,
      });
    } else {
      for (const r of list) {
        const k = bucketLabel(r.created_at, period);
        map.set(k, (map.get(k) || 0) + 1);
      }
      const series = Array.from(map.entries()).map(([bucket, total]) => ({ bucket, total }));
      const total = series.reduce((a, b) => a + (b.total || 0), 0);

      return ok({
        ok: true,
        meta: { period, event_type: eventType, country, since, unknownCount },
        countries,
        countries_map,
        series,
        total,
      });
    }
  } catch (e) {
    return bad(e.message || String(e), 500);
  }
};
