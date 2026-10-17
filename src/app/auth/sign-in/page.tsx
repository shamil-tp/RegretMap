import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { safeNextPath } from "@/lib/auth-redirect";
import { NO_INDEX } from "@/lib/site";

export const metadata: Metadata = { title: "Sign in", robots: NO_INDEX };

export default function SignInPage({ searchParams }: PageProps<"/auth/sign-in">) {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Sign in</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Sign in to mark stories as helpful and keep track of the experiences you share.
      </p>
      <div className="mt-8">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-surface" />}>
          <SignInForm searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function SignInForm({ searchParams }: Pick<PageProps<"/auth/sign-in">, "searchParams">) {
  const params = await searchParams;
  const notice =
    params.error === "link"
      ? "That confirmation link didn't work or has expired. Try signing in, or sign up again for a new link."
      : undefined;
  return <AuthForm mode="sign-in" next={safeNextPath(params.next)} notice={notice} />;
}
