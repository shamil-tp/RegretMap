"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { CHAT_LIMITS } from "@/lib/chat/evidence";
import { answerDestinationQuestion } from "@/lib/chat/service";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

/** Questions per IP, plus an IP-independent total (client IPs can be forged). */
const ipLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });
const globalLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });

const requestSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80),
    question: z
      .string()
      .transform((value) => value.replace(/\s+/g, " ").trim())
      .pipe(z.string().min(CHAT_LIMITS.questionMin).max(CHAT_LIMITS.questionMax)),
    history: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            text: z.string().max(CHAT_LIMITS.answerMax + 500),
          })
          .strict(),
      )
      .max(20)
      .default([]),
  })
  .strict();

export type ChatSource = { id: string; title: string };

/** Only what the chat UI needs — never provider or database details. */
export type ChatActionResult =
  | { status: "answer"; answer: string; sources: ChatSource[]; sufficientEvidence: boolean; fromDemo: boolean }
  | { status: "insufficient"; message: string }
  /** AI unavailable, but here are the stories most related to the question. */
  | { status: "fallback"; message: string; sources: ChatSource[] }
  | { status: "error"; message: string; retryable: boolean };

export async function askDestinationQuestion(input: unknown): Promise<ChatActionResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((i) => i.path[0] === "question" && i.code === "too_big");
    return {
      status: "error",
      retryable: false,
      message: tooLong
        ? `Please keep your question under ${CHAT_LIMITS.questionMax} characters.`
        : "Please enter a question about this destination.",
    };
  }

  if (ipLimiter.isLimited(clientIp(await headers())) || globalLimiter.isLimited("all")) {
    return {
      status: "error",
      retryable: true,
      message: "You're asking questions quickly. Please wait a minute and try again.",
    };
  }

  const result = await answerDestinationQuestion(parsed.data);
  switch (result.status) {
    case "answer":
      return {
        status: "answer",
        answer: result.answer.answer,
        sources: result.answer.sources,
        sufficientEvidence: result.answer.sufficientEvidence,
        fromDemo: result.fromDemo,
      };
    case "insufficient":
      return {
        status: "insufficient",
        message: `There aren't any stories about ${result.destinationName} on RegretMap yet, so there's nothing to answer from. Been there? Share your experience and help the next traveller.`,
      };
    case "not_found":
      return { status: "error", retryable: false, message: "This destination couldn't be found." };
    case "unavailable":
      if (result.reason !== "not_configured" && result.related && result.related.length > 0) {
        return {
          status: "fallback",
          message:
            "The answer helper is busy right now, so here are the stories most related to your question instead.",
          sources: result.related,
        };
      }
      return {
        status: "error",
        retryable: result.reason !== "not_configured",
        message:
          result.reason === "not_configured"
            ? "The travel chat isn't set up on this site yet."
            : result.reason === "busy"
              ? "The travel chat is busy right now. Please try again in a minute."
              : "The travel chat couldn't answer right now. Please try again.",
      };
  }
}
