// Supabase client initialization
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

let client = null;

export function initializeSupabase() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
  }
  
  client = createClient(config.supabaseUrl, config.supabaseAnonKey);
  console.log('Supabase client initialized');
  return client;
}

export function getClient() {
  if (!client) {
    throw new Error('Supabase client not initialized. Call initializeSupabase first.');
  }
  return client;
}

export default getClient;
