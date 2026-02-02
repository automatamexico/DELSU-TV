import { supabase } from "../supabaseClient";

function getSessionId() {
  const key = "hispanatv_session_id";
  let s = localStorage.getItem(key);
  if (!s) {
    s = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).slice(0, 60);
    localStorage.setItem(key, s);
  }
  return s;
}

export async function trackEvent(event_type, payload = {}) {
  try {
    const session_id = getSessionId();
    const row = {
      event_type,
      session_id,
      page_path: payload.page_path || null,
      channel_id: payload.channel_id || null,
      country: null, // (si quieres país exacto, lo metemos vía Netlify Function)
      user_agent: navigator.userAgent,
    };
    await supabase.from("analytics_events").insert([row]);
  } catch {
    // silencio total: analítica jamás debe romper el sitio
  }
}
