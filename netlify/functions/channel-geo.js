// netlify/functions/channel-geo.js
// Lee top países desde channel_views_geo y responde { byCountry: [{country_name, count}] }
// No requiere dependencias: usa REST de Supabase.

const allowOrigin = '*'; // si quieres, limita a tu dominio

function getChannelId(url) {
  const u = new URL(url);
  // acepta varias claves por compatibilidad
  return (
    u.searchParams.get('channel_id') ||
    u.searchParams.get('channelId')   ||
    u.searchParams.get('id')          ||
    u.searchParams.get('cid')         ||
    ''
  ).trim();
}

const json = (status, body) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-store',
    },
  });
};

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return json(500, { error: 'Missing Supabase env vars' });
    }

    const channelId = getChannelId(request.url);
    if (!channelId) return json(400, { error: 'channel_id is required' });

    // Consulta REST a la tabla agregada por país (ya tiene views_count por país)
    const qs = new URLSearchParams({
      select: 'country_name,views_count',
      // filtros
      [`channel_id`]: `eq.${channelId}`,
      // orden y límite
      order: 'views_count.desc.nullslast',
      limit: '4',
    });

    const url = `${SUPABASE_URL}/rest/v1/channel_views_geo?${qs.toString()}`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Prefer: 'count=exact',
      },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return json(res.status, { error: 'supabase_rest_error', details: txt });
    }

    const rows = await res.json(); // [{country_name, views_count}, ...]
    const byCountry = (Array.isArray(rows) ? rows : [])
      .map(r => ({
        country_name: r.country_name || '—',
        count: Number(r.views_count || 0),
      }));

    return json(200, { byCountry });
  } catch (e) {
    return json(500, { error: 'unexpected', message: e?.message || String(e) });
  }
}
