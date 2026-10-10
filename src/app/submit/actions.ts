"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import {
  parseSubmission,
  type StorySubmission,
  type SubmissionState,
} from "@/lib/story-submission";
import { moderateStory, retryPendingModerations } from "@/lib/moderation/service";
import { submitStory } from "@/lib/submissions";
import { getViewer } from "@/lib/supabase/session";

/** Accepted submissions per IP: 5 per 10 minutes (in memory, per instance). */
const submitLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: 5 });
/**
 * IP-independent cap per instance, because client IP headers can be forged.
 * submissions.ts also enforces a database-backed cap shared by all instances.
 */
const globalSubmitLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: 30 });

const FIELDS = [
  "locationType",
  "destinationId",
  "placeName",
  "placeContext",
  "placeRegion",
  "placeCountry",
  "placeKind",
  "placeLatitude",
  "placeLongitude",
  "title",
  "body",
  "challenge",
  "lesson",
  "advice",
  "category",
  "place",
  "travelMonth",
  "travelYear",
  "latitude",
  "longitude",
  "consent",
  "submissionKey",
  "website",
] as const satisfies readonly (keyof StorySubmission | "consent" | "website")[];

const UNAVAILABLE = "We couldn't save your story right now. Nothing was published. Please try again in a moment.";

export async function submitStoryAction(
  _previous: SubmissionState,
  formData: FormData,
): Promise<SubmissionState> {
  // Only known text fields are read; files or other value types are rejected.
  const raw: Record<string, string> = {};
  for (const field of FIELDS) {
    const value = formData.get(field);
    if (value === null) continue;
    if (typeof value !== "string") {
      return { status: "error", message: "The submission was not in the expected format." };
    }
    raw[field] = value;
  }

  const parsed = parseSubmission(raw);
  if (!parsed.success) {
    if (parsed.fieldErrors.website || parsed.fieldErrors.submissionKey) {
      return {
        status: "error",
        message: "This submission couldn't be accepted. Please reload the page and try again.",
      };
    }
    return {
      status: "invalid",
      fieldErrors: parsed.fieldErrors,
      message: "Please fix the highlighted fields.",
    };
  }

  if (submitLimiter.isLimited(clientIp(await headers())) || globalSubmitLimiter.isLimited("all")) {
    return {
      status: "error",
      message: "You've shared several stories recently. Please wait a few minutes and try again.",
    };
  }

  // Hybrid: anyone may submit; a signed-in author is linked privately.
  const viewer = await getViewer();
  const result = await submitStory(parsed.data, { authorId: viewer?.id });
  if (result.ok) {
    const storyId = result.storyId;
    if (storyId) {
      // AI moderation runs after the response is sent, so submitting stays fast.
      // It only labels the review queue; the story stays 'pending' regardless.
      after(async () => {
        try {
          await moderateStory(storyId);
          await retryPendingModerations(2);
        } catch (error) {
          console.error(`[moderation] unexpected error: ${error instanceof Error ? error.name : "unknown"}`);
        }
      });
    }
    if (viewer) revalidatePath("/account");
    return {
      status: "submitted",
      destinationName: result.destination.name,
      destinationSlug: result.destination.slug,
      proposedDestination: result.proposedDestination,
    };
  }

  switch (result.reason) {
    case "invalid_destination":
      return {
        status: "invalid",
        fieldErrors: { destinationId: "This location isn't available. Choose another from the suggestions." },
        message: "Please fix the highlighted fields.",
      };
    case "location_too_far":
      return {
        status: "invalid",
        fieldErrors: { latitude: "The map pin is too far from the destination you chose." },
        message: "Please fix the highlighted fields.",
      };
    case "busy":
      return {
        status: "error",
        message:
          "We're receiving a lot of stories right now. Nothing was saved — please try again later.",
      };
    case "duplicate_content":
      return {
        status: "error",
        message: "It looks like this story was already submitted. It's waiting for review.",
      };
    default:
      return { status: "error", message: UNAVAILABLE };
  }
}
