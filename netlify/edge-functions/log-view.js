// netlify/edge-functions/log-view.js
export default async (request, context) => {
  try {
    const url = new URL(request.url);
    const channelId = url.searchParams.get('channel_id');
    if (!channelId) return new Response('missing channel_id', { status: 400 });

    // IP del cliente (best-effort)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-nf-client-connection-ip') ||
      context.ip ||
      '0.0.0.0';

    // País detectado por Netlify (edge geo)
    const country = context.geo?.country?.code || 'XX';

    // Variables de entorno en runtime Edge
    const SB_URL = Deno.env.get('REACT_APP_SUPABASE_URL');
    const SB_KEY = Deno.env.get('REACT_APP_SUPABASE_ANON_KEY');
    if (!SB_URL || !SB_KEY) return new Response('missing Supabase env', { status: 500 });

    // Inserción en tu tabla (ajusta nombres si difieren)
    const payload = {
      channel_id: channelId,
      ip,
      country_code: country,
      viewed_at: new Date().toISOString(),
    };

    const resp = await fetch(`${SB_URL}/rest/v1/views_by_country`, {
      method: 'POST',
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(`supabase error: ${resp.status} ${text}`, { status: 500 });
    }

    return new Response('ok', { status: 200 });
  } catch (e) {
    return new Response(`edge error: ${e.message}`, { status: 500 });
  }
};

// Ruta pública para esta Edge Function
export const config = { path: '/log-view' };
