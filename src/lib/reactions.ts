/**
 * "Regret emoji" reactions a signed-in traveller can leave on a story.
 * 'helpful' is the original reaction; the rest were added with migration
 * 20261012120000. Counts are maintained by the database, never by clients.
 */
export const REACTIONS = [
  { type: "helpful", emoji: "👍", label: "Helpful" },
  { type: "yikes", emoji: "😬", label: "Yikes" },
  { type: "been_there", emoji: "🙋", label: "Been there" },
  { type: "good_tip", emoji: "💡", label: "Good tip" },
] as const;

export type ReactionType = (typeof REACTIONS)[number]["type"];

export const REACTION_TYPES = REACTIONS.map((r) => r.type) as [ReactionType, ...ReactionType[]];

export function isReactionType(value: unknown): value is ReactionType {
  return typeof value === "string" && (REACTION_TYPES as string[]).includes(value);
}

/** Keeps only known types with sane, non-negative integer counts. */
export function cleanReactionCounts(value: unknown): Partial<Record<ReactionType, number>> {
  if (!value || typeof value !== "object") return {};
  const out: Partial<Record<ReactionType, number>> = {};
  for (const [key, count] of Object.entries(value as Record<string, unknown>)) {
    if (isReactionType(key) && typeof count === "number" && Number.isInteger(count) && count > 0) {
      out[key] = count;
    }
  }
  return out;
}
