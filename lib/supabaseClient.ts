import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Log missing credentials in development
if (typeof window !== 'undefined') {
  if (!supabaseUrl) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }
  if (!supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials missing. This is normal during some build phases but will fail at runtime.");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co', 
  supabaseKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);