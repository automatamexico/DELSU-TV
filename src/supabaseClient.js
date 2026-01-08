// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const urlFromEnv = process.env.REACT_APP_SUPABASE_URL?.trim();
const keyFromEnv = process.env.REACT_APP_SUPABASE_ANON_KEY?.trim();

const FALLBACK_URL = 'https://uqzcnlmhmglzflkuzczk.supabase.co';
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxemNubG1obWdsemZsa3V6Y3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNjMyODcsImV4cCI6MjA3MzczOTI4N30.9WQKKHmxYtZVsGl6Zc-SAmer9doVxTlTstplCoC7t_g';

const supabaseUrl = urlFromEnv || FALLBACK_URL;
const supabaseAnonKey = keyFromEnv || FALLBACK_ANON_KEY;

if (!urlFromEnv || !keyFromEnv) {
  console.warn('[Supabase] Usando FALLBACKS. Configura REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY en Netlify.');
} else {
  console.info('[Supabase] Usando variables de entorno (OK).');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export default supabase;
export const SB_URL = supabaseUrl;
