import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with service role privileges
 * This bypasses RLS and should ONLY be used for trusted operations like seeding test data
 *
 * IMPORTANT: Only use this in server-side code and only when absolutely necessary
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase service role credentials');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
