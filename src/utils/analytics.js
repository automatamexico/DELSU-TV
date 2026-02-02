// src/utils/analytics.js

function getOrCreateSessionId() {
  const key = "htv_session_id";
  let sid = localStorage.getItem(key);
  if (!sid) {
    sid = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, sid);
  }
  return sid;
}

export async function logEvent({ event_type, page_path, channel_id }) {
  try {
    const session_id = getOrCreateSessionId();
    const payload = {
      event_type,
      page_path: page_path || window.location.pathname,
      channel_id: channel_id || null,
      session_id,
      user_agent: navigator.userAgent,
    };

    // 🔒 Blindado: siempre pega a tu Function
    await fetch("/analytics-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true, // ayuda cuando cierran la pestaña
    });
  } catch {
    // No rompas la app si falla analítica
  }
}
