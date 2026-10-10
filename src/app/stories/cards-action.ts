"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { DataUnavailableError, getHelpfulState, getStoriesByIds, STORY_LIMIT } from "@/lib/data";
import type { HelpfulState } from "@/lib/helpful";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import type { StoryWithDestination } from "@/lib/stories";
import { getViewer } from "@/lib/supabase/session";

/*
 * Loads the full text for the next page of story cards ("Show more"). Only
 * published stories are returned (RLS + explicit filter), never anything the
 * public can't already read; ids are validated and the page size is bounded.
 */

const ipLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });
const inputSchema = z.object({ ids: z.array(z.uuid()).min(1).max(STORY_LIMIT.cardsPerRequest) }).strict();

export type StoryCardsResult =
  | { status: "ok"; stories: StoryWithDestination[]; helpful: HelpfulState }
  | { status: "error"; message: string };

export async function loadStoryCards(input: unknown): Promise<StoryCardsResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Those stories couldn't be loaded." };
  if (ipLimiter.isLimited(clientIp(await headers()))) {
    return { status: "error", message: "You're loading stories quickly. Please wait a moment." };
  }
  try {
    const stories = await getStoriesByIds(parsed.data.ids);
    const viewer = await getViewer();
    const helpful = await getHelpfulState(stories.map((s) => s.id), viewer?.id ?? null);
    return { status: "ok", stories, helpful };
  } catch (error) {
    if (!(error instanceof DataUnavailableError)) throw error;
    return { status: "error", message: "Stories couldn't be loaded right now. Please try again." };
  }
}
