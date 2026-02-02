// src/utils/analytics.js
function getSessionId() {
  const key = "htv_sid";
  let sid = localStorage.getItem(key);
  if (!sid) {
    sid = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, sid);
  }
  return sid;
}

export async function logEvent({ event_type, page_path = null, channel_id = null, user_id = null }) {
  try {
    const payload = {
      event_type,
      page_path,
      channel_id,
      user_id,
      session_id: getSessionId(),
    };

    // manda a Netlify Function (ella pone el country)
    await fetch("/analytics-event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true, // útil en page unload
    });
  } catch {
    // Silencio total. Analytics no debe romper tu app.
  }
}
