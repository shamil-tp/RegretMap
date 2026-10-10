import { z } from "zod";
import {
  formatTravelMonth,
  storyCategories,
  type StoryCategory,
  type StoryWithDestination,
} from "@/lib/stories";

/*
 * Evidence selection, prompt payload and output validation for AI "Before you
 * go" recommendations. Pure functions — no network or database access.
 *
 * The model sees stories only as short references (S1, S2, …). The server maps
 * references back to real story ids and rejects any reference it didn't send,
 * so the model can never invent or redirect a citation.
 */

export const PROMPT_VERSION = "rec-v1";
/** Fewer published stories than this → honest "not enough evidence" state. */
export const MIN_EVIDENCE_STORIES = 2;
/** Upper bound on stories sent to the model (newest first). */
export const MAX_EVIDENCE_STORIES = 12;

const FIELD_LIMITS = { title: 140, body: 600, challenge: 300, lesson: 300, advice: 300 } as const;

export type EvidenceSet = { stories: StoryWithDestination[]; fromDemo: boolean };

/**
 * Real (non-demo) stories are preferred. Demo stories are used only when a
 * destination has fewer than MIN_EVIDENCE_STORIES real ones, and the result is
 * then flagged so the UI labels it as generated from demo examples.
 */
export function selectEvidence(stories: StoryWithDestination[]): EvidenceSet {
  const real = stories.filter((story) => !story.isDemo);
  const pool = real.length >= MIN_EVIDENCE_STORIES ? real : stories;
  const chosen = pool.slice(0, MAX_EVIDENCE_STORIES);
  return { stories: chosen, fromDemo: chosen.some((story) => story.isDemo) };
}

const clip = (value: string | undefined, max: number) =>
  value && value.length > max ? `${value.slice(0, max - 1)}…` : value;

/** Delimited, size-bounded evidence text plus the reference → story map. */
export function buildEvidencePayload(destinationName: string, stories: StoryWithDestination[]) {
  const refs = new Map<string, StoryWithDestination>();
  const items = stories.map((story, index) => {
    const ref = `S${index + 1}`;
    refs.set(ref, story);
    return {
      ref,
      category: story.category,
      travel_month: story.travelMonth ? formatTravelMonth(story.travelMonth) : undefined,
      place: clip(story.place, 80),
      title: clip(story.title, FIELD_LIMITS.title),
      what_happened: clip(story.body, FIELD_LIMITS.body),
      what_went_wrong: clip(story.challenge, FIELD_LIMITS.challenge),
      lesson: clip(story.lesson, FIELD_LIMITS.lesson),
      advice: clip(story.advice, FIELD_LIMITS.advice),
    };
  });
  const text = `<destination>${JSON.stringify(destinationName)}</destination>\n<stories>${JSON.stringify(items)}</stories>`;
  return { text, refs };
}

const categoryValues = Object.keys(storyCategories) as [StoryCategory, ...StoryCategory[]];

export const recommendationOutputSchema = z
  .object({
    overview: z.string().trim().min(1).max(400),
    recommendations: z
      .array(
        z
          .object({
            category: z.enum(categoryValues),
            title: z.string().trim().min(3).max(90),
            advice: z.string().trim().min(10).max(300),
            sources: z.array(z.string().regex(/^S\d{1,2}$/)).min(1).max(6),
            mixed_experiences: z.boolean().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(5),
    limitations: z.string().trim().max(240).optional(),
  })
  .strict();

/** JSON schema given to Gemini for structured output (mirrors the zod schema). */
export const RECOMMENDATION_JSON_SCHEMA = {
  type: "object",
  properties: {
    overview: { type: "string" },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string", enum: categoryValues },
          title: { type: "string" },
          advice: { type: "string" },
          sources: { type: "array", items: { type: "string" } },
          mixed_experiences: { type: "boolean" },
        },
        required: ["category", "title", "advice", "sources"],
      },
    },
    limitations: { type: "string" },
  },
  required: ["overview", "recommendations"],
};

export type Recommendation = {
  category: StoryCategory;
  title: string;
  advice: string;
  /** Real, eligible source stories (validated server-side). */
  sources: { id: string; title: string }[];
  /** Number of distinct supporting stories — computed by the server. */
  evidenceCount: number;
  mixedExperiences: boolean;
};

export type DestinationRecommendations = {
  destinationId: string;
  overview: string;
  recommendations: Recommendation[];
  limitations?: string;
  /** Stories given to the model. */
  storyCount: number;
  fromDemo: boolean;
  generatedAt: string;
  model: string;
  promptVersion: string;
};

const LINK_PATTERN = /https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|in|io|xyz|shop|info|biz)\b/i;

/**
 * Validates untrusted model text. Returns null if anything is malformed, cites
 * a story that wasn't provided, or contains links (possible injected content).
 */
export function validateRecommendations(
  text: string,
  refs: Map<string, StoryWithDestination>,
  meta: { destinationId: string; fromDemo: boolean; model: string; generatedAt: string },
): DestinationRecommendations | null {
  if (text.length > 8000) return null;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = recommendationOutputSchema.safeParse(json);
  if (!parsed.success) return null;
  const output = parsed.data;

  const texts = [output.overview, output.limitations ?? "", ...output.recommendations.flatMap((r) => [r.title, r.advice])];
  if (texts.some((value) => LINK_PATTERN.test(value))) return null;

  const recommendations: Recommendation[] = [];
  for (const rec of output.recommendations) {
    const refsUsed = [...new Set(rec.sources)];
    const stories = refsUsed.map((ref) => refs.get(ref));
    // A fabricated reference invalidates the whole answer.
    if (stories.some((story) => !story || story.destinationId !== meta.destinationId)) return null;
    recommendations.push({
      category: rec.category,
      title: rec.title,
      advice: rec.advice,
      sources: stories.map((story) => ({ id: story!.id, title: story!.title })),
      evidenceCount: refsUsed.length,
      mixedExperiences: rec.mixed_experiences ?? false,
    });
  }

  return {
    destinationId: meta.destinationId,
    overview: output.overview,
    recommendations,
    limitations: output.limitations || undefined,
    storyCount: refs.size,
    fromDemo: meta.fromDemo,
    generatedAt: meta.generatedAt,
    model: meta.model,
    promptVersion: PROMPT_VERSION,
  };
}

/** Re-checks a cached payload: shape is sane and every source is still eligible. */
export function isValidCachedPayload(
  payload: unknown,
  destinationId: string,
  eligibleIds: Set<string>,
): payload is DestinationRecommendations {
  const value = payload as DestinationRecommendations | null;
  return Boolean(
    value &&
      value.destinationId === destinationId &&
      typeof value.overview === "string" &&
      Array.isArray(value.recommendations) &&
      value.recommendations.length > 0 &&
      value.recommendations.every(
        (rec) =>
          rec.category in storyCategories &&
          Array.isArray(rec.sources) &&
          rec.sources.length > 0 &&
          rec.sources.every((source) => eligibleIds.has(source.id)),
      ),
  );
}
