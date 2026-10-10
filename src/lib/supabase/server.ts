import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export class SupabaseConfigError extends Error {}

let client: SupabaseClient | null = null;

/** Validated public Supabase config (URL + publishable key); throws if missing. */
export function publicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !url.startsWith("https://") || !key) {
    throw new SupabaseConfigError(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL (https) and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return { url, key };
}

/**
 * Server-only Supabase client for public reads. It uses the publishable key,
 * so Row Level Security always applies — no privileged key is used here, and
 * this module cannot be imported into Client Components.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const { url, key } = publicSupabaseConfig();
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
