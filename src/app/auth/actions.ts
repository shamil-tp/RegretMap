"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth-redirect";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { createSessionClient } from "@/lib/supabase/session";

/*
 * Email + password auth via Supabase Auth (no custom auth, no password storage).
 * Sessions live in Supabase's cookies, set through @supabase/ssr.
 */

const ipLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });
const globalLimiter = createRateLimiter({ windowMs: 60_000, max: 120 });

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address.").max(254),
  password: z
    .string()
    .min(8, "Use at least 8 characters for your password.")
    .max(72, "Passwords can be at most 72 characters."),
});

export type AuthFormState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "check_email"; email: string };

function friendlyAuthError(error: { code?: string; status?: number }) {
  switch (error.code) {
    case "invalid_credentials":
      return "Email or password is incorrect.";
    case "email_not_confirmed":
      return "Please confirm your email address first — check your inbox for the link.";
    case "weak_password":
      return "Please choose a stronger password (at least 8 characters).";
    case "signup_disabled":
      return "New sign-ups are currently disabled.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (error.status === 429) return "Too many attempts. Please wait a few minutes and try again.";
  return "Something went wrong. Please try again.";
}

async function guard(formData: FormData) {
  if (ipLimiter.isLimited(clientIp(await headers())) || globalLimiter.isLimited("all")) {
    return { error: "Too many attempts. Please wait a minute and try again." } as const;
  }
  const parsed = credentialsSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details." } as const;
  return { data: parsed.data } as const;
}

export async function signInAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const checked = await guard(formData);
  if ("error" in checked) return { status: "error", message: checked.error! };

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword(checked.data);
  if (error) return { status: "error", message: friendlyAuthError(error) };

  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("next")));
}

export async function signUpAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const checked = await guard(formData);
  if ("error" in checked) return { status: "error", message: checked.error! };

  const requestHeaders = await headers();
  const origin =
    requestHeaders.get("origin") ??
    `${requestHeaders.get("x-forwarded-proto") ?? "http"}://${requestHeaders.get("host")}`;
  const next = safeNextPath(formData.get("next"));

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signUp({
    ...checked.data,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { status: "error", message: friendlyAuthError(error) };

  // With email confirmation off, Supabase signs the user in immediately.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next);
  }
  // Same response whether or not the email already has an account (no enumeration).
  return { status: "check_email", email: checked.data.email };
}

export async function signOutAction() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
