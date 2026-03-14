import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for server-side operations that bypass RLS.
 * Use ONLY in trusted server code (cron jobs, admin API routes).
 * Never expose this client or its key to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
