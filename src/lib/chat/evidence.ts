import { z } from "zod";
import { stripRefs, unsupportedNumbers } from "@/lib/ai/grounding";
import type { StoryCategory, StoryWithDestination } from "@/lib/stories";

/*
 * Destination chat: question-aware story ranking and answer validation.
 * Pure functions — no network or database access.
 */

export const CHAT_LIMITS = {
  questionMin: 2,
  questionMax: 500,
  /** Earlier turns sent as context (never as evidence). */
  historyTurns: 4,
  historyChars: 800,
  /** Stories sent to the model per question. */
  maxStories: 8,
  answerMax: 1500,
  maxSources: 6,
} as const;

const CATEGORY_KEYWORDS: Record<StoryCategory, string[]> = {
  transport: ["transport", "bus", "taxi", "train", "drive", "driving", "road", "flight", "auto", "rickshaw", "car", "traffic", "getting"],
  planning: ["plan", "planning", "itinerary", "permit", "book", "booking", "schedule", "timing", "crowd", "crowds", "crowded", "queue", "closed", "busy"],
  weather: ["weather", "rain", "rainy", "monsoon", "snow", "cold", "hot", "heat", "season", "winter", "summer", "mist"],
  packing: ["pack", "packing", "clothes", "shoes", "gear", "bring", "wear", "jacket"],
  activity: ["trek", "hike", "hiking", "activity", "activities", "altitude", "swim", "swimming", "tour", "sightseeing"],
  accessibility: ["accessible", "accessibility", "wheelchair", "steps", "mobility", "elderly", "disabled", "stairs"],
  safety: ["safe", "safety", "scam", "scams", "theft", "lifeguard", "currents", "careful"],
  costs: ["cost", "costs", "budget", "money", "price", "prices", "cash", "atm", "expensive", "cheap", "pay", "payment", "fare", "shopping"],
  local_customs: ["custom", "customs", "temple", "culture", "etiquette", "dress", "photo", "photos", "respect"],
  other: [],
};

const STOPWORDS = new Set(
  "what which when where while with from that this there their they them have about should would could your into does were been being than then just also only more most some such very what's i'm".split(
    " ",
  ),
);

function tokens(text: string) {
  return (text.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

/**
 * Simple, predictable relevance: category keyword matches weigh most, then
 * word overlap with the story. Ties keep the original (newest-first) order.
 * With no signal at all, the newest stories are used.
 */
export function rankStoriesForQuestion<T extends StoryWithDestination>(
  stories: T[],
  question: string,
  limit: number = CHAT_LIMITS.maxStories,
): T[] {
  const words = new Set((question.toLowerCase().match(/[a-z]+/g) ?? []));
  const questionTokens = new Set(tokens(question));
  const scored = stories.map((story, index) => {
    const categoryHit = CATEGORY_KEYWORDS[story.category].some((k) => words.has(k)) ? 3 : 0;
    const storyTokens = new Set(
      tokens([story.title, story.place, story.body, story.challenge, story.lesson, story.advice].join(" ")),
    );
    let overlap = 0;
    for (const t of questionTokens) if (storyTokens.has(t)) overlap += 1;
    return { story, index, score: categoryHit + overlap };
  });
  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.story);
}

export const chatOutputSchema = z
  .object({
    answer: z.string().trim().min(1).max(CHAT_LIMITS.answerMax),
    sources: z.array(z.string().regex(/^S\d{1,2}$/)).max(CHAT_LIMITS.maxSources),
    sufficient_evidence: z.boolean(),
  })
  .strict();

export const CHAT_JSON_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    sources: { type: "array", items: { type: "string" } },
    sufficient_evidence: { type: "boolean" },
  },
  required: ["answer", "sources", "sufficient_evidence"],
};

export type ChatAnswer = {
  answer: string;
  sources: { id: string; title: string }[];
  sufficientEvidence: boolean;
};

const LINK_PATTERN = /https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|in|io|xyz|shop|info|biz)\b/i;

/** Every story field the model was shown, for grounding checks. */
function storyText(story: StoryWithDestination) {
  return [story.title, story.place, story.body, story.challenge, story.lesson, story.advice]
    .filter(Boolean)
    .join(" ");
}

/**
 * Validates untrusted model text. Null (→ retry, then an honest fallback) if
 * it's malformed, cites a story the server didn't send for this destination,
 * contains links, or states a number that isn't in the stories it cites or the
 * question. An answer citing no story comes back with an empty `answer`: the
 * caller replaces it with a fixed "not covered" message, so uncited text —
 * where general knowledge would leak in — is never shown.
 */
export function validateChatAnswer(
  text: string,
  refs: Map<string, StoryWithDestination>,
  destinationId: string,
  question = "",
): ChatAnswer | null {
  if (text.length > 6000) return null;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = chatOutputSchema.safeParse(json);
  if (!parsed.success || LINK_PATTERN.test(parsed.data.answer)) return null;

  const sources: ChatAnswer["sources"] = [];
  const cited: StoryWithDestination[] = [];
  for (const ref of new Set(parsed.data.sources)) {
    const story = refs.get(ref);
    if (!story || story.destinationId !== destinationId) return null;
    sources.push({ id: story.id, title: story.title });
    cited.push(story);
  }
  if (sources.length === 0) return { answer: "", sources, sufficientEvidence: false };

  const answer = stripRefs(parsed.data.answer);
  if (!answer) return null;
  if (unsupportedNumbers(answer, [...cited.map(storyText), question]).length > 0) return null;
  return { answer, sources, sufficientEvidence: parsed.data.sufficient_evidence };
}

export type ChatTurn = { role: "user" | "assistant"; text: string };

/** Bounded earlier turns, clipped; used only as conversational context. */
export function boundHistory(history: ChatTurn[]): ChatTurn[] {
  return history.slice(-CHAT_LIMITS.historyTurns).map((turn) => ({
    role: turn.role,
    text: turn.text.slice(0, CHAT_LIMITS.historyChars),
  }));
}
