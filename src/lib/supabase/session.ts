import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { publicSupabaseConfig } from "@/lib/supabase/server";

/*
 * Per-request Supabase client carrying the signed-in user's session (cookies).
 * Queries made with it run as that user under RLS. Uses the publishable key
 * only — never a privileged key.
 */
export async function createSessionClient() {
  const { url, key } = publicSupabaseConfig();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Server Components can't set cookies; proxy.ts refreshes the session.
        }
      },
    },
  });
}

export type Viewer = { id: string; email: string | null; isModerator: boolean };

/** Moderators are listed (comma-separated) in the server-only MODERATOR_EMAILS. */
export function isModeratorEmail(email: string | null | undefined, list = process.env.MODERATOR_EMAILS) {
  if (!email) return false;
  const allowed = (list ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

/**
 * The signed-in user, verified with the Supabase Auth server (getUser), or null.
 * Never trust a user id sent by the browser — use this instead.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  try {
    const supabase = await createSessionClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const { id, email, email_confirmed_at } = data.user;
    return {
      id,
      email: email ?? null,
      isModerator: Boolean(email_confirmed_at) && isModeratorEmail(email),
    };
  } catch {
    return null;
  }
});
