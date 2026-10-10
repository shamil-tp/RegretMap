"use client";

import { AlertCircle, Loader2, MessageCircle, Pencil, Reply, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import {
  deleteComment,
  editComment,
  postComment,
  type CommentActionResult,
} from "@/app/stories/comment-actions";
import { buttonClasses } from "@/components/ui/button";
import { COMMENT_LIMITS, type CommentThread, type StoryComment } from "@/lib/comments";
import { pluralize } from "@/lib/stories";

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

/** Threads longer than this start collapsed behind "View replies". */
const REPLIES_SHOWN = 2;

type Props = {
  storyId: string;
  threads: CommentThread[];
  count: number;
  signedIn: boolean;
};

/**
 * Story discussion. Every write goes through a server action that uses the
 * viewer's own session (RLS); the list only changes after the server confirms
 * and the page re-renders with fresh data — no optimistic fake comments.
 */
export function StoryComments({ storyId, threads, count, signedIn }: Props) {
  const signInHref = `/auth/sign-in?next=${encodeURIComponent(`/stories/${storyId}#discussion`)}`;

  return (
    <div>
      {signedIn ? (
        <CommentForm storyId={storyId} parentId={null} label="Add a comment" />
      ) : (
        <SignInPrompt href={signInHref} />
      )}

      {threads.length === 0 ? (
        <p className="mt-6 rounded-lg bg-mint/50 px-4 py-3 text-sm text-ink">
          No comments yet. Been there? Start the conversation.
        </p>
      ) : (
        <ul className="mt-6 space-y-4" aria-label={pluralize(count, "comment")}>
          {threads.map((thread) => (
            <ThreadItem
              key={thread.id}
              storyId={storyId}
              thread={thread}
              signedIn={signedIn}
              signInHref={signInHref}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SignInPrompt({ href, compact = false }: { href: string; compact?: boolean }) {
  return (
    <p
      className={`rounded-lg border border-dashed border-line bg-card text-sm text-ink-muted ${
        compact ? "mt-3 px-3 py-2" : "px-4 py-3"
      }`}
    >
      <Link href={href} className="font-semibold text-accent underline-offset-2 hover:underline">
        Sign in
      </Link>{" "}
      to {compact ? "reply" : "join the conversation"}. You&apos;ll come straight back here.
    </p>
  );
}

function ThreadItem({
  storyId,
  thread,
  signedIn,
  signInHref,
}: {
  storyId: string;
  thread: CommentThread;
  signedIn: boolean;
  signInHref: string;
}) {
  const [replying, setReplying] = useState(false);
  const [expanded, setExpanded] = useState(thread.replies.length <= REPLIES_SHOWN);
  const visibleReplies = expanded ? thread.replies : thread.replies.slice(0, REPLIES_SHOWN);
  const repliesId = useId();

  return (
    <li>
      <CommentCard
        storyId={storyId}
        comment={thread}
        onReply={thread.deleted ? undefined : () => setReplying((value) => !value)}
        replying={replying}
      />

      {replying &&
        (signedIn ? (
          <div className="ml-4 border-l-2 border-strawberry pl-4 sm:ml-6">
            <CommentForm
              storyId={storyId}
              parentId={thread.id}
              label={`Reply to ${thread.authorName}`}
              autoFocus
              onDone={() => setReplying(false)}
            />
          </div>
        ) : (
          <div className="ml-4 sm:ml-6">
            <SignInPrompt href={signInHref} compact />
          </div>
        ))}

      {thread.replies.length > 0 && (
        <div className="ml-4 mt-3 border-l-2 border-strawberry pl-4 sm:ml-6">
          <ul id={repliesId} className="space-y-3" aria-label={`Replies to ${thread.authorName || "a deleted comment"}`}>
            {visibleReplies.map((reply) => (
              <li key={reply.id}>
                <CommentCard storyId={storyId} comment={reply} isReply />
              </li>
            ))}
          </ul>
          {!expanded && (
            <button
              type="button"
              aria-controls={repliesId}
              aria-expanded={false}
              onClick={() => setExpanded(true)}
              className="mt-2 min-h-10 rounded text-sm font-medium text-accent hover:underline"
            >
              View {pluralize(thread.replies.length - REPLIES_SHOWN, "more reply", "more replies")}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function CommentCard({
  storyId,
  comment,
  isReply = false,
  onReply,
  replying = false,
}: {
  storyId: string;
  comment: StoryComment;
  isReply?: boolean;
  onReply?: () => void;
  replying?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (comment.deleted) {
    return (
      <div className="rounded-lg border border-dashed border-line px-4 py-3 text-sm italic text-ink-muted">
        This comment was deleted.
      </div>
    );
  }

  function remove() {
    if (!window.confirm("Delete this comment? This can't be undone.")) return;
    setError(null);
    startTransition(async () => {
      const result = await safely(() => deleteComment({ storyId, commentId: comment.id }));
      if (result.status === "ok") router.refresh();
      else setError(messageFor(result));
    });
  }

  return (
    <article
      className={`rounded-lg border border-line px-4 py-3 shadow-sm ${isReply ? "bg-canvas" : "bg-card"}`}
      aria-busy={pending}
    >
      <header className="flex flex-wrap items-center gap-x-2 text-sm">
        <span className="font-semibold text-ink">{comment.authorName}</span>
        {comment.mine && <span className="rounded-full bg-lavender px-2 text-xs text-ink">You</span>}
        <time dateTime={comment.createdAt} className="text-xs text-ink-muted">
          {dateFormatter.format(new Date(comment.createdAt))} UTC
        </time>
        {comment.edited && <span className="text-xs text-ink-muted">· edited</span>}
      </header>

      {editing ? (
        <CommentForm
          storyId={storyId}
          commentId={comment.id}
          initialBody={comment.body}
          label="Edit your comment"
          autoFocus
          onDone={() => setEditing(false)}
        />
      ) : (
        // Plain text only: React escapes it, so markup in comments is never executed.
        <p className="mt-1 whitespace-pre-line break-words text-[0.95rem] leading-relaxed text-ink">
          {comment.body}
        </p>
      )}

      {!editing && (onReply || comment.mine) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-1 text-sm">
          {onReply && (
            <button
              type="button"
              onClick={onReply}
              aria-expanded={replying}
              className="inline-flex min-h-9 items-center gap-1 rounded px-1.5 text-ink-muted hover:text-ink"
            >
              <Reply aria-hidden className="size-3.5" />
              Reply
            </button>
          )}
          {comment.mine && (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                disabled={pending}
                className="inline-flex min-h-9 items-center gap-1 rounded px-1.5 text-ink-muted hover:text-ink"
              >
                <Pencil aria-hidden className="size-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="inline-flex min-h-9 items-center gap-1 rounded px-1.5 text-ink-muted hover:text-accent"
              >
                {pending ? (
                  <Loader2 aria-hidden className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 aria-hidden className="size-3.5" />
                )}
                Delete
              </button>
            </>
          )}
        </div>
      )}
      {error && <ErrorText message={error} />}
    </article>
  );
}

function CommentForm({
  storyId,
  parentId = null,
  commentId,
  initialBody = "",
  label,
  autoFocus = false,
  onDone,
}: {
  storyId: string;
  parentId?: string | null;
  /** Set when editing an existing comment. */
  commentId?: string;
  initialBody?: string;
  label: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const fieldId = useId();
  const editing = Boolean(commentId);
  const tooLong = body.length > COMMENT_LIMITS.bodyMax;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || !body.trim() || tooLong) return;
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await safely(() =>
        editing
          ? editComment({ storyId, commentId, body })
          : postComment({ storyId, parentId, body }),
      );
      if (result.status === "ok") {
        if (!editing) setBody("");
        setSaved(true);
        router.refresh();
        onDone?.();
      } else {
        setError(messageFor(result));
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-3" aria-busy={pending}>
      <label htmlFor={fieldId} className={parentId || editing ? "sr-only" : "text-sm font-semibold text-ink"}>
        {label}
      </label>
      <textarea
        id={fieldId}
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          setSaved(false);
        }}
        autoFocus={autoFocus}
        rows={parentId || editing ? 2 : 3}
        maxLength={COMMENT_LIMITS.bodyMax + 200}
        placeholder={parentId ? "Write a reply…" : "Share a tip or ask the traveller something…"}
        aria-invalid={tooLong || undefined}
        aria-describedby={`${fieldId}-count`}
        className="mt-1 block w-full resize-y rounded-md border border-line bg-card px-3 py-2 text-[0.95rem] text-ink placeholder:text-ink-muted/80 focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/30"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || !body.trim() || tooLong}
          className={buttonClasses("primary", "min-h-9 px-4 py-1.5")}
        >
          {pending && <Loader2 aria-hidden className="size-4 animate-spin" />}
          {editing ? "Save" : parentId ? "Reply" : "Post comment"}
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            disabled={pending}
            className={buttonClasses("ghost", "min-h-9")}
          >
            Cancel
          </button>
        )}
        <span
          id={`${fieldId}-count`}
          className={`ml-auto text-xs ${tooLong ? "font-semibold text-accent" : "text-ink-muted"}`}
        >
          {body.length}/{COMMENT_LIMITS.bodyMax}
        </span>
      </div>
      <p aria-live="polite" className="sr-only">
        {saved ? (editing ? "Comment updated." : "Comment posted.") : ""}
      </p>
      {error && <ErrorText message={error} />}
    </form>
  );
}

function ErrorText({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-accent-hover">
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

function messageFor(result: Exclude<CommentActionResult, { status: "ok" }>) {
  return result.status === "signed_out"
    ? "Your session has ended. Please sign in again."
    : result.message;
}

async function safely(action: () => Promise<CommentActionResult>): Promise<CommentActionResult> {
  try {
    return await action();
  } catch {
    return { status: "error", message: "We couldn't reach RegretMap. Check your connection and try again." };
  }
}

/** Heading block used by the story page. */
export function DiscussionHeading({ count }: { count: number | null }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3">
      <h2 id="discussion-heading" className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
        <MessageCircle aria-hidden className="size-5 text-accent" />
        Travellers talking
      </h2>
      {count !== null && <span className="text-sm text-ink-muted">{pluralize(count, "comment")}</span>}
    </div>
  );
}
