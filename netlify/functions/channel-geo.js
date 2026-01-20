// netlify/functions/channel-geo.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const channelId =
      params.channel_id || params.channelId || params.id || params.cid;

    if (!channelId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'channel_id requerido' }) };
    }

    const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !serviceKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Faltan variables de entorno Supabase' }) };
    }

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    // 1) Intentar vista agregada si existe
    let top = [];
    try {
      const { data, error } = await supabase
        .from('views_by_country')
        .select('country, count')
        .eq('channel_id', channelId)
        .order('count', { ascending: false })
        .limit(50);
      if (!error && Array.isArray(data)) {
        top = data.map(r => ({ country_name: r.country, count: r.count }));
      }
    } catch {}

    // 2) RPC opcional
    if (top.length === 0) {
      try {
        const { data, error } = await supabase.rpc('channel_views_top_countries', {
          p_channel_id: channelId, p_limit: 50,
        });
        if (!error && Array.isArray(data) && data.length) {
          top = data.map(r => ({
            country_name: r.country_name || r.country || r.country_code || r.pais || r.code || '—',
            count: Number(r.count || r.views || 0),
          }));
        }
      } catch {}
    }

    // 3) Fallback sobre tablas crudas
    if (top.length === 0) {
      const tables = ['view_logs', 'play_logs', 'analytics_events'];
      const cols = ['country_name', 'country', 'country_code', 'pais', 'code', 'iso2'];
      for (const t of tables) {
        for (const c of cols) {
          try {
            const { data, error } = await supabase
              .from(t)
              .select(`${c}, count:count()`)
              .eq('channel_id', channelId)
              .not(c, 'is', null)
              .order('count', { ascending: false })
              .limit(50);
            if (!error && Array.isArray(data) && data.length) {
              top = data.map(r => ({ country_name: r[c] || '—', count: Number(r.count || 0) }));
              break;
            }
          } catch {}
        }
        if (top.length) break;
      }
    }

    const byCountry = top
      .filter(x => x && x.country_name)
      .map(x => ({ country_name: String(x.country_name), count: Number(x.count || 0) }));

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ byCountry }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};
