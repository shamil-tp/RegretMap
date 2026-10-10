/** Helpful counts plus the signed-in viewer's own reactions, for a set of stories. */
export type HelpfulState = {
  /** False when likes can't be loaded (e.g. migration not applied yet). */
  available: boolean;
  counts: Record<string, number>;
  /** Story ids the signed-in viewer marked helpful. */
  liked: string[];
  signedIn: boolean;
};
