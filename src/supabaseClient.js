// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const urlFromEnv = process.env.REACT_APP_SUPABASE_URL?.trim();
const keyFromEnv = process.env.REACT_APP_SUPABASE_ANON_KEY?.trim();

// Respaldos
const FALLBACK_URL = 'https://uqzcnlmhmglzflkuzczk.supabase.co';
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxemNubG1obWdsemZsa3V6Y3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNjMyODcsImV4cCI6MjA3MzczOTI4N30.9WQKKHmxYtZVsGl6Zc-SAmer9doVxTlTstplCoC7t_g';

const supabaseUrl = urlFromEnv || FALLBACK_URL;
const supabaseAnonKey = keyFromEnv || FALLBACK_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const SB_URL = supabaseUrl;

// Para compatibilidad con imports por defecto
export default supabase;
