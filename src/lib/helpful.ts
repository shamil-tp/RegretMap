import type { ReactionType } from "@/lib/reactions";

/** Reaction counts plus the signed-in viewer's own reactions, for a set of stories. */
export type HelpfulState = {
  /** False when reactions can't be loaded (e.g. migration not applied yet). */
  available: boolean;
  /** Helpful counts per story id. */
  counts: Record<string, number>;
  /** Story ids the signed-in viewer marked helpful. */
  liked: string[];
  signedIn: boolean;
  /** Emoji reaction counts per story id (empty until the emoji migration is applied). */
  emoji?: Record<string, Partial<Record<ReactionType, number>>>;
  /** The viewer's own emoji reactions per story id. */
  mine?: Record<string, ReactionType[]>;
};
