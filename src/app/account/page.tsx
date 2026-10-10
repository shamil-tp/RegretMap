import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOutAction } from "@/app/auth/actions";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { formatPublishedDate } from "@/lib/stories";
import { createSessionClient, getViewer } from "@/lib/supabase/session";

export const metadata: Metadata = { title: "Your account — RegretMap" };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-md bg-surface" />}>
        <AccountContent />
      </Suspense>
    </div>
  );
}

const statusLabels: Record<string, { label: string; tone: "accent" | "neutral" | "demo"; help: string }> = {
  pending: { label: "In review", tone: "demo", help: "Waiting for a moderator. Not public yet." },
  published: { label: "Published", tone: "accent", help: "Visible on RegretMap." },
  rejected: { label: "Not published", tone: "neutral", help: "A moderator decided not to publish it." },
  hidden: { label: "Hidden", tone: "neutral", help: "Removed from public view." },
};

type OwnStory = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  destination: { name: string; slug: string } | null;
};

async function AccountContent() {
  const viewer = await getViewer();
  if (!viewer) redirect("/auth/sign-in?next=/account");

  // Runs as the signed-in user: RLS returns only their own authorship rows and
  // their own stories (in any status) plus published ones.
  let stories: OwnStory[] = [];
  let loadError = false;
  try {
    const supabase = await createSessionClient();
    const authored = await supabase.from("story_authors").select("story_id");
    if (authored.error) throw authored.error;
    const ids = (authored.data as { story_id: string }[]).map((row) => row.story_id);
    if (ids.length > 0) {
      const result = await supabase
        .from("stories")
        .select("id, title, status, created_at, destination:destinations(name, slug)")
        .in("id", ids)
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      stories = result.data as unknown as OwnStory[];
    }
  } catch {
    loadError = true;
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Your account</h1>
          <p className="mt-1 text-sm text-ink-muted">Signed in as {viewer.email}</p>
        </div>
        <form action={signOutAction}>
          <button type="submit" className={buttonClasses("secondary")}>
            <LogOut aria-hidden className="size-4" />
            Sign out
          </button>
        </form>
      </div>

      <section aria-labelledby="my-stories" className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="my-stories" className="text-lg font-semibold text-ink">
            Your stories
          </h2>
          <Link href="/submit" className="text-sm font-medium text-accent hover:underline">
            Share an experience
          </Link>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          Stories you shared while signed in. They&apos;re always shown anonymously.
        </p>

        {loadError ? (
          <p role="alert" className="mt-4 text-sm text-ink-muted">
            Your stories can&apos;t be loaded right now. Please try again in a moment.
          </p>
        ) : stories.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">You haven&apos;t shared any stories yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {stories.map((story) => {
              const status = statusLabels[story.status] ?? statusLabels.hidden;
              return (
                <li key={story.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div className="min-w-0">
                    {story.status === "published" ? (
                      <Link href={`/stories/${story.id}`} className="font-medium text-ink hover:text-accent-hover">
                        {story.title}
                      </Link>
                    ) : (
                      <p className="font-medium text-ink">{story.title}</p>
                    )}
                    <p className="text-sm text-ink-muted">
                      {story.destination?.name ?? "Proposed destination"} · Shared{" "}
                      {formatPublishedDate(story.created_at)}
                    </p>
                    <p className="text-xs text-ink-muted">{status.help}</p>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
