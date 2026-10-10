"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { setReaction } from "@/app/stories/reaction-action";
import { REACTIONS, type ReactionType } from "@/lib/reactions";

/**
 * Regret emoji reactions (👍 😬 🙋 💡). Optimistic: the tapped emoji updates and
 * pops at once, then settles to the counts the server returns, or rolls back
 * if the server refuses. Signed-out visitors get a sign-in link instead.
 */
export function ReactionBar({
  storyId,
  counts,
  mine,
  signedIn,
}: {
  storyId: string;
  counts: Partial<Record<ReactionType, number>>;
  mine: ReactionType[];
  signedIn: boolean;
}) {
  const pathname = usePathname();
  const [state, setState] = useState({ counts, mine });
  const [popped, setPopped] = useState<ReactionType | null>(null);
  const [message, setMessage] = useState("");
  const busy = useRef(false);

  async function toggle(type: ReactionType) {
    if (!signedIn) {
      setMessage("signin");
      return;
    }
    if (busy.current) return;
    busy.current = true;
    setMessage("");
    const previous = state;
    const on = !previous.mine.includes(type);
    setState({
      counts: { ...previous.counts, [type]: Math.max(0, (previous.counts[type] ?? 0) + (on ? 1 : -1)) },
      mine: on ? [...previous.mine, type] : previous.mine.filter((t) => t !== type),
    });
    if (on) setPopped(type);

    try {
      const result = await setReaction({ storyId, type, on });
      if (result.status === "ok") {
        setState((current) => ({ counts: result.counts, mine: current.mine }));
      } else {
        setState(previous);
        setMessage(result.status === "signed_out" ? "signin" : result.message);
      }
    } catch {
      setState(previous);
      setMessage("That didn't save. Check your connection and try again.");
    } finally {
      busy.current = false;
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {REACTIONS.map(({ type, emoji, label }) => {
        const active = state.mine.includes(type);
        const count = state.counts[type] ?? 0;
        return (
          <button
            key={type}
            type="button"
            onClick={() => toggle(type)}
            aria-pressed={active}
            title={label}
            className={`group inline-flex min-h-9 items-center gap-1 rounded-full border px-2.5 text-sm transition-[transform,background-color,border-color] duration-150 hover:-translate-y-0.5 active:scale-95 ${
              active ? "border-coral bg-strawberry text-ink" : "border-line bg-card text-ink-muted hover:border-coral"
            }`}
          >
            <span
              aria-hidden
              onAnimationEnd={() => setPopped(null)}
              className={`text-base leading-none ${popped === type ? "animate-emoji-pop" : ""}`}
            >
              {emoji}
            </span>
            <span className="text-xs font-medium">{label}</span>
            {count > 0 && <span className="text-xs tabular-nums text-ink-muted">{count}</span>}
            <span className="sr-only">
              {`, ${count} ${count === 1 ? "reaction" : "reactions"}${active ? ", you reacted" : ""}`}
            </span>
          </button>
        );
      })}
      <span role="status" className="text-xs text-ink-muted">
        {message === "signin" ? (
          <>
            <Link
              href={`/auth/sign-in?next=${encodeURIComponent(pathname)}`}
              className="rounded text-accent hover:underline"
            >
              Sign in
            </Link>{" "}
            to react.
          </>
        ) : (
          message
        )}
      </span>
    </span>
  );
}
