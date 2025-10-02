// src/supabaseClients.js
import supabaseDefault, { supabase } from './supabaseClientCore';
export { supabase };
export default supabaseDefault;

// 1) Intenta tomar de variables de entorno (CRA usa REACT_APP_* en build-time)
const urlFromEnv = process.env.REACT_APP_SUPABASE_URL?.trim();
const keyFromEnv = process.env.REACT_APP_SUPABASE_ANON_KEY?.trim();

// 2) Tus respaldos (los que ya usabas y sí funcionaban)
//    ⚠️ Son públicos, no pasa nada si están en el cliente (es la anon key)
const FALLBACK_URL = 'https://uqzcnlmhmglzflkuzczk.supabase.co';
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxemNubG1obWdsemZsa3V6Y3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNjMyODcsImV4cCI6MjA3MzczOTI4N30.9WQKKHmxYtZVsGl6Zc-SAmer9doVxTlTstplCoC7t_g';

// 3) Decide qué usar
const supabaseUrl = urlFromEnv || FALLBACK_URL;
const supabaseAnonKey = keyFromEnv || FALLBACK_ANON_KEY;

// 4) Mensajes útiles en consola (para producción también)
if (!urlFromEnv || !keyFromEnv) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Supabase] Usando valores de respaldo (FALLBACK). ' +
      'Configura REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY en Netlify.'
  );
} else {
  // eslint-disable-next-line no-console
  console.info('[Supabase] Usando variables de entorno de Netlify (OK).');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  // Evita cache agresivo en algunas rutas
  global: {
    fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
  },
});
