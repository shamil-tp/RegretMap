import { z } from "zod";

/*
 * RegretMap moderation policy (Phase 7 — annotate only).
 *
 * The AI only RECOMMENDS. Stories always stay 'pending' until a human publishes
 * or rejects them; the result below just labels the human review queue.
 * Passing moderation never means a story is true or verified.
 *
 *  - allow_review        ordinary, relevant travel story (incl. negative ones)
 *  - flag_review         ambiguous or sensitive: personal info, harassment,
 *                        links/promotion, harmful instructions, or unsure
 *  - reject_recommended  clear spam, off-topic, abusive/threatening, unusable
 */

export const MODERATION_DECISIONS = ["allow_review", "flag_review", "reject_recommended"] as const;

export const MODERATION_CATEGORIES = [
  "spam",
  "promotional",
  "off_topic",
  "harassment",
  "threat",
  "hate",
  "personal_info",
  "suspicious_link",
  "scam_attempt",
  "dangerous_instructions",
  "unusable",
] as const;

export type ModerationDecision = (typeof MODERATION_DECISIONS)[number];
export type ModerationCategory = (typeof MODERATION_CATEGORIES)[number];
export type QueueLabel = "clear" | "needs_attention" | "reject_recommended" | "unmoderated";

/** Below this confidence an "allow" still goes to "needs attention". */
export const MIN_CONFIDENCE_TO_CLEAR = 0.6;

/** Validates the model's JSON. Anything outside the allowlists is rejected. */
export const moderationResultSchema = z
  .object({
    decision: z.enum(MODERATION_DECISIONS),
    categories: z.array(z.enum(MODERATION_CATEGORIES)).max(MODERATION_CATEGORIES.length),
    reason_codes: z
      .array(z.string().regex(/^[a-z][a-z0-9_]{0,39}$/))
      .max(6)
      .default([]),
    summary: z.string().trim().min(1).max(300),
    confidence: z.number().min(0).max(1).optional(),
  })
  .strict();

export type ModerationResult = z.output<typeof moderationResultSchema>;

/** Parses untrusted model text; returns null for anything malformed. */
export function parseModerationResult(text: string): ModerationResult | null {
  if (text.length > 4000) return null;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const result = moderationResultSchema.safeParse(json);
  if (!result.success) return null;
  return { ...result.data, categories: [...new Set(result.data.categories)] };
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// 8+ digits with optional separators, e.g. +91 98765 43210 or 555-123-4567.
const PHONE = /(?:\+?\d[\s-]?){8,}\d/;
const LINK = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|in|io|co|xyz|info|biz|shop|link|ly)\b/i;

/**
 * Deterministic backstop that doesn't depend on the model: contact details and
 * links always send a story to human attention.
 */
export function localSignals(text: string): ModerationCategory[] {
  const signals: ModerationCategory[] = [];
  const withoutEmails = text.replace(EMAIL, " ");
  if (withoutEmails !== text || PHONE.test(text)) signals.push("personal_info");
  // Emails are personal info, not links, so they're removed before this check.
  if (LINK.test(withoutEmails)) signals.push("suspicious_link");
  return signals;
}

/** Server-side policy: model recommendation + local signals → queue label. */
export function queueLabelFor(
  result: ModerationResult | null,
  signals: ModerationCategory[],
): QueueLabel {
  if (!result) return signals.length > 0 ? "needs_attention" : "unmoderated";
  if (result.decision === "reject_recommended") return "reject_recommended";
  if (
    result.decision === "flag_review" ||
    signals.length > 0 ||
    result.categories.length > 0 ||
    (result.confidence ?? 0) < MIN_CONFIDENCE_TO_CLEAR
  ) {
    return "needs_attention";
  }
  return "clear";
}
