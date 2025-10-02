// src/supabaseclients.js
import { supabase as client } from './supabaseClients';

// Soporta import nombrado y por defecto:
// import { supabase } from '../supabaseclients'
// import supabase from '../supabaseclients'
export const supabase = client;
export default client;
