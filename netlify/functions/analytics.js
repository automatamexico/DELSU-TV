// netlify/functions/analytics.js
const { createClient } = require('@supabase/supabase-js');

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      // CORS (tu sitio mismo)
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return json(500, { ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY' });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const payload = JSON.parse(event.body || '{}');

    // Validación mínima
    const event_type = payload.event_type;
    if (!['page_view', 'play'].includes(event_type)) {
      return json(400, { ok: false, error: 'Invalid event_type' });
    }

    const row = {
      event_type,
      page_path: payload.page_path || null,
      channel_id: payload.channel_id || null,
      country: payload.country || null,
      session_id: payload.session_id || null,
      user_id: payload.user_id || null,
      user_agent: payload.user_agent || null,
    };

    const { error } = await sb.from('analytics_events').insert([row]);
    if (error) return json(500, { ok: false, error: error.message });

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { ok: false, error: e.message || String(e) });
  }
};
