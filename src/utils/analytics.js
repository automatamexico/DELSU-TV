// src/utils/analytics.js
function getSessionId() {
  const k = 'hispanatv_sid';
  let v = localStorage.getItem(k);
  if (!v) {
    v = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(k, v);
  }
  return v;
}

function getCountryHint() {
  // En navegador no puedes saber país real sin servicio externo.
  // De momento manda null, y luego lo resolvemos server-side si tú quieres.
  return null;
}

export async function logEvent({ event_type, page_path, channel_id, user_id }) {
  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type,
        page_path: page_path || window.location.pathname,
        channel_id: channel_id || null,
        country: getCountryHint(),
        session_id: getSessionId(),
        user_id: user_id || null,
        user_agent: navigator.userAgent,
      }),
    });
  } catch {
    // no hacemos nada: analytics no debe romper la app
  }
}
