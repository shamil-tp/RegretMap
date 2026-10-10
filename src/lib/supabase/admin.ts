import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SupabaseConfigError } from "@/lib/supabase/server";

let client: SupabaseClient | null = null;

/**
 * Privileged server-only client (bypasses RLS). Use it ONLY for trusted,
 * validated writes in src/lib/submissions.ts — never for public reads, and
 * never import it into Client Components.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !url.startsWith("https://") || !key) {
    throw new SupabaseConfigError(
      "Story submissions are not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.",
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
