"use server";

import { headers } from "next/headers";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import {
  parseSubmission,
  type StorySubmission,
  type SubmissionState,
} from "@/lib/story-submission";
import { submitStory } from "@/lib/submissions";

/** Accepted submissions per IP: 5 per 10 minutes (in memory, per instance). */
const submitLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: 5 });

const FIELDS = [
  "destinationId",
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

  if (submitLimiter.isLimited(clientIp(await headers()))) {
    return {
      status: "error",
      message: "You've shared several stories recently. Please wait a few minutes and try again.",
    };
  }

  const result = await submitStory(parsed.data);
  if (result.ok) {
    return {
      status: "submitted",
      destinationName: result.destination.name,
      destinationSlug: result.destination.slug,
    };
  }

  switch (result.reason) {
    case "invalid_destination":
      return {
        status: "invalid",
        fieldErrors: { destinationId: "This destination isn't available. Choose another." },
        message: "Please fix the highlighted fields.",
      };
    case "location_too_far":
      return {
        status: "invalid",
        fieldErrors: { latitude: "The map pin is too far from the destination you chose." },
        message: "Please fix the highlighted fields.",
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
