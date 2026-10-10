"use client";

import { AlertCircle, MailCheck } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { signInAction, signUpAction, type AuthFormState } from "@/app/auth/actions";
import { buttonClasses } from "@/components/ui/button";

const inputClasses =
  "w-full rounded-md border border-line bg-card px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/30";

export function AuthForm({
  mode,
  next,
  notice,
}: {
  mode: "sign-in" | "sign-up";
  next: string;
  notice?: string;
}) {
  const action = mode === "sign-in" ? signInAction : signUpAction;
  // The action redirects on success; Next.js handles that navigation itself.
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, {
    status: "idle",
  });
  const otherHref = `${mode === "sign-in" ? "/auth/sign-up" : "/auth/sign-in"}?next=${encodeURIComponent(next)}`;

  if (state.status === "check_email") {
    return (
      <div role="status" className="rounded-lg border border-line bg-mint/60 px-5 py-6">
        <MailCheck aria-hidden className="size-6 text-accent" />
        <h2 className="mt-3 font-semibold text-ink">Check your email</h2>
        <p className="mt-1 text-sm text-ink-muted">
          If {state.email} can be used for a new account, we&apos;ve sent a confirmation link.
          Open it in this browser to finish signing up.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-line bg-card p-6 shadow-sm">
      {notice && (
        <p className="rounded-md bg-surface px-3 py-2.5 text-sm text-ink-muted">{notice}</p>
      )}
      {state.status === "error" && (
        <p role="alert" className="flex items-start gap-2 rounded-md border border-accent/40 bg-accent-soft px-3 py-2.5 text-sm text-ink">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
          {state.message}
        </p>
      )}
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="auth-email" className="text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className={`mt-1.5 ${inputClasses}`}
        />
      </div>
      <div>
        <label htmlFor="auth-password" className="text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="auth-password"
          name="password"
          type="password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          required
          minLength={8}
          maxLength={72}
          aria-describedby={mode === "sign-up" ? "password-hint" : undefined}
          className={`mt-1.5 ${inputClasses}`}
        />
        {mode === "sign-up" && (
          <p id="password-hint" className="mt-1 text-xs text-ink-muted">
            At least 8 characters.
          </p>
        )}
      </div>
      <button type="submit" disabled={pending} className={buttonClasses("primary", "w-full")}>
        {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
      </button>
      <p className="text-center text-sm text-ink-muted">
        {mode === "sign-in" ? "New to RegretMap? " : "Already have an account? "}
        <Link href={otherHref} className="rounded font-medium text-accent hover:underline">
          {mode === "sign-in" ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
