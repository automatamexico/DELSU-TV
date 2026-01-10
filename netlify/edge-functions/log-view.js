// netlify/edge-functions/log-view.js
export default async (req) => {
  try {
    const geoHeader = req.headers.get('x-nf-geo'); // Geo de Netlify
    let country = 'US';
    if (geoHeader) {
      try {
        const g = JSON.parse(geoHeader);
        country = (g && g.country && g.country.code || 'US').toUpperCase();
      } catch {}
    }

    const url = new URL(req.url);
    const channelId = url.searchParams.get('channel_id');
    if (!channelId) return new Response('missing channel_id', { status: 400 });

    const rpc = await fetch(
      `${process.env.REACT_APP_SUPABASE_URL}/rest/v1/rpc/increment_channel_country_view`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.REACT_APP_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          p_channel_id: channelId,
          p_country_code: country,
        }),
      }
    );

    if (!rpc.ok) {
      const txt = await rpc.text();
      return new Response(`rpc error: ${txt}`, { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true, country }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(`error: ${e && e.message ? e.message : String(e)}`, { status: 500 });
  }
};

export const config = { path: '/log-view' };
