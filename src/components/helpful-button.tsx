"use client";

import { ThumbsUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { setHelpful } from "@/app/stories/helpful-action";
import { ReactionBar } from "@/components/reaction-bar";
import type { ReactionType } from "@/lib/reactions";

export type HelpfulProps = {
  storyId: string;
  count: number;
  helpful: boolean;
  signedIn: boolean;
  /** Emoji reaction counts; present once the emoji migration is applied. */
  emoji?: Partial<Record<ReactionType, number>>;
  mine?: ReactionType[];
};

/** Regret emoji bar when available, otherwise the original Helpful button. */
export function StoryReactions(props: HelpfulProps) {
  return props.emoji ? (
    <ReactionBar storyId={props.storyId} counts={props.emoji} mine={props.mine ?? []} signedIn={props.signedIn} />
  ) : (
    <HelpfulButton {...props} />
  );
}

/** "Helpful" toggle: optimistic, rolled back if the server doesn't confirm. */
export function HelpfulButton({ storyId, count, helpful, signedIn }: HelpfulProps) {
  const pathname = usePathname();
  const [state, setState] = useState({ count, helpful });
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  async function toggle() {
    if (!signedIn) {
      setMessage("signin");
      return;
    }
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setMessage("");
    const previous = state;
    const next = !previous.helpful;
    setState({ helpful: next, count: Math.max(0, previous.count + (next ? 1 : -1)) });

    try {
      const result = await setHelpful({ storyId, helpful: next });
      if (result.status === "ok") {
        setState({ helpful: result.helpful, count: result.count });
      } else {
        setState(previous);
        setMessage(result.status === "signed_out" ? "signin" : result.message);
      }
    } catch {
      setState(previous);
      setMessage("That didn't save. Check your connection and try again.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={state.helpful}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm transition-colors disabled:opacity-60 ${
          state.helpful
            ? "border-accent bg-accent-soft text-accent-hover"
            : "border-line text-ink-muted hover:text-ink"
        }`}
      >
        <ThumbsUp aria-hidden className="size-3.5" />
        Helpful
        <span className="tabular-nums">{state.count > 0 ? state.count : ""}</span>
        <span className="sr-only">
          {state.count === 1 ? "1 person found this helpful" : `${state.count} people found this helpful`}
        </span>
      </button>
      <span role="status" className="text-xs text-ink-muted">
        {message === "signin" ? (
          <>
            <Link
              href={`/auth/sign-in?next=${encodeURIComponent(pathname)}`}
              className="rounded text-accent hover:underline"
            >
              Sign in
            </Link>{" "}
            to mark stories as helpful.
          </>
        ) : (
          message
        )}
      </span>
    </span>
  );
}
