import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { safeNextPath } from "@/lib/auth-redirect";

export const metadata: Metadata = { title: "Create an account — RegretMap" };

export default function SignUpPage({ searchParams }: PageProps<"/auth/sign-up">) {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Create an account</h1>
      <p className="mt-2 text-sm text-ink-muted">
        An account lets you mark stories as helpful and see the status of the stories you
        share. Your stories are always shown anonymously.
      </p>
      <div className="mt-8">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-surface" />}>
          <SignUpForm searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function SignUpForm({ searchParams }: Pick<PageProps<"/auth/sign-up">, "searchParams">) {
  const params = await searchParams;
  return <AuthForm mode="sign-up" next={safeNextPath(params.next, "/")} />;
}
