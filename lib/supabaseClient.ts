import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// This check prevents the build from crashing if variables are temporarily missing
if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials missing. This is normal during some build phases but will fail at runtime.");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co', 
  supabaseKey || 'placeholder-key'
);