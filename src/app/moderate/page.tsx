import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ModerationItem, type QueueItem } from "@/components/moderation-item";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/supabase/session";

export const metadata: Metadata = { title: "Moderation — RegretMap", robots: { index: false } };

export default function ModeratePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Suspense fallback={<div className="h-48 animate-pulse rounded-md bg-surface" />}>
        <ModerationQueue />
      </Suspense>
    </div>
  );
}

const labelOrder: Record<string, number> = {
  reject_recommended: 0,
  needs_attention: 1,
  unmoderated: 2,
  clear: 3,
};

async function ModerationQueue() {
  const viewer = await getViewer();
  if (!viewer) redirect("/auth/sign-in?next=/moderate");
  // Don't reveal the page to non-moderators.
  if (!viewer.isModerator) notFound();

  const { data, error } = await getSupabaseAdmin()
    .from("stories")
    .select(
      "id, title, body, challenge, lesson, advice, place_name, category, created_at, latitude, longitude, " +
        "destination:destinations(name, slug, status, region, country), " +
        "moderation:story_moderation(queue_label, decision, categories, summary, status, last_error)",
    )
    .eq("status", "pending")
    .order("created_at")
    .limit(100);

  if (error) {
    return (
      <p role="alert" className="text-sm text-ink-muted">
        The review queue can&apos;t be loaded right now. Please try again in a moment.
      </p>
    );
  }

  const items = (data as unknown as QueueItem[]).sort(
    (a, b) =>
      (labelOrder[a.moderation?.queue_label ?? "unmoderated"] ?? 2) -
      (labelOrder[b.moderation?.queue_label ?? "unmoderated"] ?? 2),
  );

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Review queue</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Pending stories, most urgent first. AI labels are suggestions only — you decide.
        Publishing makes a story public; it doesn&apos;t mean it&apos;s verified.
      </p>
      {items.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">Nothing to review right now.</p>
      ) : (
        <ul className="mt-8 space-y-6">
          {items.map((item) => (
            <li key={item.id}>
              <ModerationItem item={item} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
