"use client";

import { CheckCircle2, MapPin, XCircle } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { decideStory } from "@/app/moderate/actions";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { formatPublishedDate, storyCategories, type StoryCategory } from "@/lib/stories";

export type QueueItem = {
  id: string;
  title: string;
  body: string;
  challenge: string | null;
  lesson: string | null;
  advice: string | null;
  place_name: string | null;
  category: StoryCategory;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  destination: { name: string; slug: string; status: string; region: string | null; country: string | null } | null;
  moderation: {
    queue_label: string;
    decision: string | null;
    categories: string[];
    summary: string | null;
    status: string;
    last_error: string | null;
  } | null;
};

const labels: Record<string, { text: string; tone: "accent" | "neutral" | "demo" }> = {
  reject_recommended: { text: "AI: rejection recommended", tone: "accent" },
  needs_attention: { text: "AI: needs attention", tone: "accent" },
  unmoderated: { text: "Not checked by AI", tone: "demo" },
  clear: { text: "AI: no concerns found", tone: "neutral" },
};

export function ModerationItem({ item }: { item: QueueItem }) {
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const label = labels[item.moderation?.queue_label ?? "unmoderated"] ?? labels.unmoderated;
  const proposed = item.destination?.status === "draft";

  async function decide(decision: "publish" | "reject") {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      const response = await decideStory({ storyId: item.id, decision });
      setResult(
        response.status === "ok"
          ? { ok: true, text: decision === "publish" ? "Published." : "Rejected — it stays hidden." }
          : { ok: false, text: response.message },
      );
    } catch {
      setResult({ ok: false, text: "That didn't save. Check your connection and try again." });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <article className="rounded-lg border-2 border-line p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={label.tone}>{label.text}</Badge>
        <Badge>{storyCategories[item.category] ?? item.category}</Badge>
        {proposed && <Badge tone="demo">New destination proposal</Badge>}
        <span className="text-xs text-ink-muted">Submitted {formatPublishedDate(item.created_at)}</span>
      </div>
      <h2 className="mt-3 text-lg font-semibold text-ink">{item.title}</h2>
      <p className="mt-1 inline-flex items-center gap-1 text-sm text-ink-muted">
        <MapPin aria-hidden className="size-3.5" />
        {[item.place_name, item.destination?.name, item.destination?.region, item.destination?.country]
          .filter(Boolean)
          .join(", ")}
        {item.latitude != null && " · has map pin"}
      </p>
      {item.moderation?.summary && (
        <p className="mt-3 rounded-md bg-surface px-3 py-2 text-sm text-ink-muted">
          <span className="font-medium text-ink">AI note:</span> {item.moderation.summary}
          {item.moderation.categories.length > 0 && ` (${item.moderation.categories.join(", ")})`}
        </p>
      )}
      {item.moderation?.status === "failed" && (
        <p className="mt-3 text-xs text-ink-muted">AI check failed ({item.moderation.last_error}); review manually.</p>
      )}
      <dl className="mt-3 space-y-2 text-sm text-ink">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">What happened</dt>
          <dd className="whitespace-pre-line">{item.body}</dd>
        </div>
        {item.challenge && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">What went wrong</dt>
            <dd>{item.challenge}</dd>
          </div>
        )}
        {item.lesson && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Lesson</dt>
            <dd>{item.lesson}</dd>
          </div>
        )}
        {item.advice && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Advice</dt>
            <dd>{item.advice}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {result ? (
          <p role="status" className={`inline-flex items-center gap-1.5 text-sm ${result.ok ? "text-ink" : "text-accent-hover"}`}>
            {result.ok ? <CheckCircle2 aria-hidden className="size-4 text-accent" /> : <XCircle aria-hidden className="size-4" />}
            {result.text}
            {result.ok && item.destination && !proposed && (
              <Link href={`/destinations/${item.destination.slug}`} className="ml-2 text-accent hover:underline">
                View destination
              </Link>
            )}
          </p>
        ) : null}
        {!result?.ok && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => decide("publish")}
              className={buttonClasses("primary")}
            >
              {proposed ? "Publish story and destination" : "Publish"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => decide("reject")}
              className={buttonClasses("secondary")}
            >
              Reject
            </button>
          </>
        )}
      </div>
    </article>
  );
}
