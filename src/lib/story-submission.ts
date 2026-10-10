import { z } from "zod";
import { storyCategories, type StoryCategory } from "@/lib/stories";

/*
 * Story submission schema, shared by the form (instant feedback) and the
 * Server Action (the real security boundary). Client-safe: no server imports.
 */

export const SUBMISSION_LIMITS = {
  title: { min: 5, max: 120 },
  body: { min: 50, max: 3000 },
  challenge: { min: 10, max: 1000 },
  lesson: { min: 10, max: 1000 },
  advice: { min: 10, max: 1000 },
  place: { max: 140 },
} as const;

export const EARLIEST_TRAVEL_YEAR = 1950;

const LOCATION_REQUIRED = "Choose a destination or place from the suggestions.";

/** Trims, normalises line endings and collapses runs of blank lines. */
export function normalizeText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const text = (label: string, { min, max }: { min: number; max: number }) =>
  z
    .string({ error: `${label} is required.` })
    .transform(normalizeText)
    .pipe(
      z
        .string()
        .min(1, `${label} is required.`)
        .min(min, `${label} must be at least ${min} characters.`)
        .max(max, `${label} must be at most ${max} characters.`),
    );

/** Empty string or missing → undefined; otherwise the parsed value. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    schema.optional(),
  );

const categoryValues = Object.keys(storyCategories) as [StoryCategory, ...StoryCategory[]];

export const storySubmissionSchema = z
  .object({
    // Location: an existing RegretMap destination, or a real-world place chosen
    // from the suggestions (attached to a nearby destination or proposed).
    locationType: z.enum(["destination", "place"], { error: LOCATION_REQUIRED }),
    destinationId: optional(z.uuid(LOCATION_REQUIRED)),
    placeName: optional(z.string().transform(normalizeText).pipe(z.string().min(1).max(120))),
    placeContext: optional(z.string().transform(normalizeText).pipe(z.string().max(200))),
    placeRegion: optional(z.string().transform(normalizeText).pipe(z.string().max(120))),
    placeCountry: optional(z.string().transform(normalizeText).pipe(z.string().max(120))),
    placeKind: optional(z.string().transform(normalizeText).pipe(z.string().max(40))),
    placeLatitude: optional(z.coerce.number().min(-90).max(90)),
    placeLongitude: optional(z.coerce.number().min(-180).max(180)),
    title: text("Title", SUBMISSION_LIMITS.title),
    body: text("What happened", SUBMISSION_LIMITS.body),
    challenge: text("What went wrong", SUBMISSION_LIMITS.challenge),
    lesson: text("Lesson learned", SUBMISSION_LIMITS.lesson),
    advice: text("Advice", SUBMISSION_LIMITS.advice),
    category: z.enum(categoryValues, { error: "Choose a category." }),
    place: optional(
      z
        .string()
        .transform(normalizeText)
        .pipe(z.string().max(SUBMISSION_LIMITS.place.max, "Place must be at most 140 characters.")),
    ),
    travelMonth: optional(
      z.coerce.number().int().min(1, "Choose a valid month.").max(12, "Choose a valid month."),
    ),
    travelYear: optional(
      z.coerce
        .number()
        .int("Enter a valid year.")
        .min(EARLIEST_TRAVEL_YEAR, `Year must be ${EARLIEST_TRAVEL_YEAR} or later.`)
        .refine((year) => year <= new Date().getFullYear(), "Year can't be in the future."),
    ),
    latitude: optional(z.coerce.number().min(-90).max(90)),
    longitude: optional(z.coerce.number().min(-180).max(180)),
    consent: z.literal("on", { error: "Please confirm this is your own experience." }),
    submissionKey: z.uuid("This form has expired. Please reload the page."),
    /** Honeypot: hidden from people; must stay empty. */
    website: z.string().max(0).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.locationType === "destination" && !value.destinationId) {
      ctx.addIssue({ code: "custom", path: ["destinationId"], message: LOCATION_REQUIRED });
    }
    if (
      value.locationType === "place" &&
      (!value.placeName || value.placeLatitude === undefined || value.placeLongitude === undefined)
    ) {
      ctx.addIssue({ code: "custom", path: ["destinationId"], message: LOCATION_REQUIRED });
    }
    if ((value.latitude === undefined) !== (value.longitude === undefined)) {
      ctx.addIssue({ code: "custom", path: ["latitude"], message: "Pick a location on the map." });
    }
    const now = new Date();
    if (
      value.travelYear === now.getFullYear() &&
      value.travelMonth !== undefined &&
      value.travelMonth > now.getMonth() + 1
    ) {
      ctx.addIssue({ code: "custom", path: ["travelMonth"], message: "Travel date can't be in the future." });
    }
  });

export type StorySubmission = z.output<typeof storySubmissionSchema>;
export type SubmissionField = keyof z.input<typeof storySubmissionSchema>;
export type FieldErrors = Partial<Record<SubmissionField, string>>;

/** Parses untrusted input; returns the first message per field on failure. */
export function parseSubmission(input: unknown):
  | { success: true; data: StorySubmission }
  | { success: false; fieldErrors: FieldErrors } {
  const result = storySubmissionSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };

  const fieldErrors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = (issue.path[0] ?? "form") as SubmissionField;
    fieldErrors[field] ??= issue.code === "unrecognized_keys" ? "Unexpected fields." : issue.message;
  }
  return { success: false, fieldErrors };
}

/** Result returned by the Server Action; shaped for the UI, never raw DB data. */
export type SubmissionState =
  | { status: "idle" }
  | { status: "invalid"; fieldErrors: FieldErrors; message: string }
  | { status: "error"; message: string }
  | {
      status: "submitted";
      destinationName: string;
      /** Null for a proposed destination (not public until approved). */
      destinationSlug: string | null;
      proposedDestination: boolean;
    };
