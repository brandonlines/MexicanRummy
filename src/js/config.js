// Configuration
export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  maxPlayers: 8,
  totalHands: 10
};

if (!config.supabaseUrl || !config.supabaseAnonKey) {
  console.warn('Supabase credentials not found in .env file');
}
