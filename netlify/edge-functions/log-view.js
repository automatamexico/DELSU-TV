// netlify/edge-functions/log-view.js
import { env } from 'netlify:edge';

export default async (request, context) => {
  try {
    const url = new URL(request.url);
    const channelId = url.searchParams.get('channel_id');
    if (!channelId) {
      return new Response('missing channel_id', { status: 400 });
    }

    // IP del cliente (mejor esfuerzo)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-nf-client-connection-ip') ||
      context.ip ||
      '0.0.0.0';

    // Geo por Netlify Edge (sin servicios externos)
    const country = context.geo?.country?.code || 'XX';

    // Variables de entorno desde Edge
    const SB_URL = env.get('REACT_APP_SUPABASE_URL');
    const SB_KEY = env.get('REACT_APP_SUPABASE_ANON_KEY');

    if (!SB_URL || !SB_KEY) {
      return new Response('missing Supabase env', { status: 500 });
    }

    // Inserta registro (ajusta la tabla/columnas a tu esquema)
    const payload = {
      channel_id: channelId,
      ip,
      country_code: country,
      // opcional: timestamp en el edge
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

// Mapea la ruta /log-view a esta función
export const config = { path: '/log-view' };
