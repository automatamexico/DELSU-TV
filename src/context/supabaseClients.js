// src/context/supabaseClients.js
import { createClient } from '@supabase/supabase-js';

// 1) Lee de variables de entorno (Netlify)
// 2) Si no existen, usa tus valores actuales como fallback
const supabaseUrl =
  process.env.REACT_APP_SUPABASE_URL ||
  'https://uqzcnlmhmglzflkuzczk.supabase.co';

const supabaseAnonKey =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxemNubG1obWdsemZsa3V6Y3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNjMyODcsImV4cCI6MjA3MzczOTI4N30.9WQKKHmxYtZVsGl6Zc-SAmer9doVxTlTstplCoC7t_g';

if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] Usando URL/ANON KEY embebidos. Para producción, define REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY en Netlify.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
