"use client";

import { AlertCircle, ArrowUp, BookOpen, Loader2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  askDestinationQuestion,
  type ChatActionResult,
  type ChatSource,
} from "@/app/destinations/[slug]/chat-action";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { CHAT_LIMITS } from "@/lib/chat/evidence";

type Message =
  | { id: number; role: "user"; text: string }
  | {
      id: number;
      role: "assistant";
      text: string;
      sources: ChatSource[];
      sufficientEvidence: boolean;
      fromDemo: boolean;
    }
  | { id: number; role: "notice"; text: string; retryQuestion?: string };

const SUGGESTIONS = [
  "What mistakes should I avoid here?",
  "What should I prepare before visiting?",
  "What do travellers say about getting around?",
  "What should I know before planning my trip?",
];

export function DestinationChat({ slug, destinationName }: { slug: string; destinationName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const nextId = useRef(1);
  /** Synchronous guard: blocks a second send before React re-renders. */
  const busy = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function ask(raw: string) {
    const text = raw.replace(/\s+/g, " ").trim();
    if (busy.current || text.length < CHAT_LIMITS.questionMin) return;
    busy.current = true;

    // Earlier turns are context only; the server re-fetches evidence each time.
    const history = messages
      .filter((m): m is Extract<Message, { role: "user" | "assistant" }> => m.role !== "notice")
      .map((m) => ({ role: m.role, text: m.text }));

    setPending(true);
    setQuestion("");
    setMessages((current) => [
      ...current.filter((m) => m.role !== "notice"),
      { id: nextId.current++, role: "user", text },
    ]);

    let result: ChatActionResult;
    try {
      result = await askDestinationQuestion({ slug, question: text, history });
    } catch {
      result = {
        status: "error",
        retryable: true,
        message: "We couldn't reach RegretMap. Check your connection and try again.",
      };
    }

    setMessages((current) => {
      const id = nextId.current++;
      if (result.status === "fallback") {
        return [
          ...current,
          {
            id,
            role: "assistant",
            text: result.message,
            sources: result.sources,
            sufficientEvidence: true,
            fromDemo: false,
          },
        ];
      }
      if (result.status === "answer") {
        return [
          ...current,
          {
            id,
            role: "assistant",
            text: result.answer,
            sources: result.sources,
            sufficientEvidence: result.sufficientEvidence,
            fromDemo: result.fromDemo,
          },
        ];
      }
      // Failed turns are removed from history so a retry starts cleanly.
      const withoutQuestion = result.status === "error" ? current.slice(0, -1) : current;
      return [
        ...withoutQuestion,
        {
          id,
          role: "notice",
          text: result.message,
          retryQuestion: result.status === "error" && result.retryable ? text : undefined,
        },
      ];
    });
    busy.current = false;
    setPending(false);
  }

  return (
    <section aria-labelledby="chat-heading" className="rounded-lg border border-line bg-card shadow-sm">
      <div className="rounded-t-lg border-b border-line bg-sky/60 px-5 py-4">
        <h2 id="chat-heading" className="font-display text-xl font-semibold text-ink">
          Ask travellers
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Get answers from experiences shared on RegretMap about {destinationName}. Answers
          only use published stories — if they don&apos;t cover your question, we&apos;ll say so.
          Conversations aren&apos;t saved.
        </p>
      </div>

      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="max-h-[28rem] space-y-4 overflow-y-auto px-5 py-4"
      >
        {messages.length === 0 && (
          <div>
            <p className="text-sm text-ink-muted">You could ask:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => ask(suggestion)}
                  disabled={pending}
                  className="min-h-10 rounded-full border border-line bg-canvas px-3.5 py-1.5 text-left text-sm text-ink hover:border-coral hover:bg-strawberry/40 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex animate-fade-up justify-end">
              <p className="max-w-[85%] break-words rounded-lg rounded-br-sm bg-lavender px-3.5 py-2 text-sm text-ink">
                <span className="sr-only">You: </span>
                {message.text}
              </p>
            </div>
          ) : message.role === "assistant" ? (
            <div key={message.id} className="max-w-[92%] animate-fade-up break-words">
              <div className="rounded-lg rounded-bl-sm border border-line bg-canvas px-3.5 py-3 text-[0.95rem] leading-relaxed text-ink">
                <span className="sr-only">RegretMap: </span>
                <p className="whitespace-pre-line">{message.text}</p>
                {!message.sufficientEvidence && (
                  <p className="mt-2 rounded-md bg-butter/70 px-2.5 py-1.5 text-xs text-ink">
                    The available RegretMap stories don&apos;t fully answer this.
                  </p>
                )}
                {message.sources.length > 0 ? (
                  <div className="mt-3 border-t border-line pt-2">
                    <p className="flex flex-wrap items-center gap-2 text-xs font-medium text-ink-muted">
                      <BookOpen aria-hidden className="size-3.5" />
                      Based on these stories
                      {message.fromDemo && <Badge tone="demo">Demo examples</Badge>}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {message.sources.map((source) => (
                        <li key={source.id} className="text-sm">
                          <Link
                            href={`/stories/${source.id}`}
                            className="rounded text-accent-hover underline-offset-2 hover:underline"
                          >
                            {source.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-ink-muted">
                    No published story covers this, so there are no sources to show.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div
              key={message.id}
              role="status"
              className="flex flex-wrap items-center gap-3 rounded-md border border-line px-3.5 py-2.5 text-sm text-ink-muted"
            >
              <AlertCircle aria-hidden className="size-4 shrink-0 text-accent" />
              <span className="flex-1 whitespace-pre-line">{message.text}</span>
              {message.retryQuestion && (
                <button
                  type="button"
                  onClick={() => ask(message.retryQuestion!)}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded text-accent hover:underline disabled:opacity-50"
                >
                  <RotateCcw aria-hidden className="size-3.5" />
                  Try again
                </button>
              )}
            </div>
          ),
        )}

        {pending && (
          <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Looking through travellers&apos; stories…
          </p>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
        className="border-t border-line p-3"
      >
        <label htmlFor="chat-question" className="sr-only">
          Your question about {destinationName}
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="chat-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(question);
              }
            }}
            rows={1}
            maxLength={CHAT_LIMITS.questionMax}
            placeholder={`Ask about travelling in ${destinationName}…`}
            className="max-h-32 min-h-10 min-w-0 flex-1 resize-y rounded-md border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/30"
          />
          <button
            type="submit"
            disabled={pending || question.trim().length < CHAT_LIMITS.questionMin}
            aria-label="Send question"
            className={buttonClasses("primary", "h-10 w-10 shrink-0 px-0")}
          >
            <ArrowUp aria-hidden className="size-4" />
          </button>
        </div>
        <p className="mt-1 text-right text-xs text-ink-muted">
          {question.length} / {CHAT_LIMITS.questionMax}
        </p>
      </form>
    </section>
  );
}
