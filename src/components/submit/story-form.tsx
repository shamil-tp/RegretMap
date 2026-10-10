"use client";

import { AlertCircle, CheckCircle2, MapPin } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { submitStoryAction } from "@/app/submit/actions";
import { ExploreMap } from "@/components/map/explore-map";
import {
  LocationPicker,
  type LocationValue,
} from "@/components/submit/location-picker";
import { buttonClasses } from "@/components/ui/button";
import {
  EARLIEST_TRAVEL_YEAR,
  parseSubmission,
  SUBMISSION_LIMITS,
  type FieldErrors,
  type SubmissionField,
  type SubmissionState,
} from "@/lib/story-submission";
import {
  formatTravelMonth,
  storyCategories,
  type Coordinates,
} from "@/lib/stories";

export type SubmittableDestination = {
  id: string;
  slug: string;
  name: string;
  region?: string;
  country?: string;
  coordinates?: Coordinates;
};

type TextField = "title" | "body" | "challenge" | "lesson" | "advice" | "place";
type Values = Record<TextField | "category" | "travelMonth" | "travelYear", string>;

const emptyValues = (): Values => ({
  title: "",
  body: "",
  challenge: "",
  lesson: "",
  advice: "",
  place: "",
  category: "",
  travelMonth: "",
  travelYear: "",
});

const fieldOrder: SubmissionField[] = [
  "destinationId",
  "place",
  "latitude",
  "travelMonth",
  "travelYear",
  "category",
  "title",
  "body",
  "challenge",
  "lesson",
  "advice",
  "consent",
];

const inputClasses =
  "w-full rounded-md border border-line bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-ink-muted aria-[invalid=true]:border-accent";

/** Remount (via `key`) to start a fresh submission with a new one-time key. */
export function StoryForm({
  destinations,
  initialDestinationId,
  submissionKey,
  onSubmitAnother,
}: {
  destinations: SubmittableDestination[];
  initialDestinationId?: string;
  submissionKey: string;
  onSubmitAnother: () => void;
}) {
  const [values, setValues] = useState<Values>(() => emptyValues());
  const [locationValue, setLocationValue] = useState<LocationValue | null>(() => {
    const initial = destinations.find((d) => d.id === initialDestinationId);
    return initial ? { type: "destination", destination: initial } : null;
  });
  const [consent, setConsent] = useState(false);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  /** Fields edited since the last submit; their server errors are stale. */
  const [edited, setEdited] = useState<ReadonlySet<SubmissionField>>(new Set());
  const summaryRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // The form is streamed in before React attaches; adopt anything typed or
  // ticked in that gap so validation sees what the user sees.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const typed: Partial<Values> = {};
    for (const key of Object.keys(emptyValues()) as (keyof Values)[]) {
      const element = form.elements.namedItem(key);
      if (
        (element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement) &&
        element.value
      ) {
        typed[key] = element.value;
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing pre-hydration DOM input
    if (Object.keys(typed).length > 0) setValues((current) => ({ ...current, ...typed }));
    const consentBox = form.elements.namedItem("consent");
    if (consentBox instanceof HTMLInputElement && consentBox.checked) setConsent(true);
  }, []);
  const successRef = useRef<HTMLHeadingElement>(null);

  const [state, formAction, pending] = useActionState(
    async (previous: SubmissionState, formData: FormData): Promise<SubmissionState> => {
      try {
        return await submitStoryAction(previous, formData);
      } catch {
        return {
          status: "error",
          message:
            "We couldn't reach RegretMap. Check your connection and try again — your story is still here.",
        };
      }
    },
    { status: "idle" },
  );

  const serverErrors: FieldErrors =
    state.status === "invalid"
      ? Object.fromEntries(
          Object.entries(state.fieldErrors).filter(
            ([field]) => !edited.has(field as SubmissionField),
          ),
        )
      : {};
  const errors: FieldErrors = clientErrors ?? serverErrors;
  const errorEntries = fieldOrder.filter((field) => errors[field]);
  // Where the optional map pin starts: the chosen destination or place.
  const pinCenter =
    locationValue?.type === "destination"
      ? locationValue.destination.coordinates
      : locationValue
        ? { latitude: locationValue.place.latitude, longitude: locationValue.place.longitude }
        : undefined;
  const pinKey =
    locationValue?.type === "destination" ? locationValue.destination.id : locationValue?.place.id;

  useEffect(() => {
    if (state.status === "submitted") successRef.current?.focus();
    else if (state.status === "invalid" || state.status === "error") summaryRef.current?.focus();
  }, [state]);

  function markEdited(...fields: SubmissionField[]) {
    setEdited((current) => new Set([...current, ...fields]));
    if (clientErrors && fields.some((f) => clientErrors[f])) {
      const next = { ...clientErrors };
      for (const f of fields) delete next[f];
      setClientErrors(next);
    }
  }

  function update(field: keyof Values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    markEdited(field);
  }

  function chooseLocation(next: LocationValue | null) {
    setLocationValue(next);
    // A new location invalidates an earlier map pin.
    setLocation(null);
    markEdited("destinationId", "latitude");
  }

  /** Hidden form fields describing the chosen location (validated on the server). */
  const locationFields: Record<string, string> =
    locationValue?.type === "destination"
      ? { locationType: "destination", destinationId: locationValue.destination.id }
      : locationValue
        ? {
            locationType: "place",
            placeName: locationValue.place.name,
            placeContext: locationValue.place.context,
            placeRegion: locationValue.place.region ?? "",
            placeCountry: locationValue.place.country ?? "",
            placeKind: locationValue.place.kind,
            placeLatitude: String(locationValue.place.latitude),
            placeLongitude: String(locationValue.place.longitude),
          }
        : {};

  function validateBeforeSubmit(event: React.FormEvent<HTMLFormElement>) {
    const result = parseSubmission({
      ...values,
      ...locationFields,
      latitude: location ? String(location.latitude) : "",
      longitude: location ? String(location.longitude) : "",
      consent: consent ? "on" : undefined,
      submissionKey,
      website: "",
    });
    setEdited(new Set());
    if (result.success) {
      setClientErrors(null);
      return;
    }
    event.preventDefault();
    setClientErrors(result.fieldErrors);
    requestAnimationFrame(() => summaryRef.current?.focus());
  }

  if (state.status === "submitted") {
    return (
      <div className="rounded-lg border border-line bg-surface px-6 py-10 text-center">
        <CheckCircle2 aria-hidden className="mx-auto size-10 text-accent" />
        <h2
          ref={successRef}
          tabIndex={-1}
          className="mt-4 font-display text-2xl font-semibold text-ink focus:outline-none"
        >
          Thanks — your story was submitted for review
        </h2>
        <p className="mx-auto mt-3 max-w-md text-ink-muted">
          It has been saved but <strong className="text-ink">isn&apos;t public yet</strong>.{" "}
          {state.proposedDestination
            ? `Once a moderator approves it, ${state.destinationName} will be added to RegretMap with your story.`
            : `Once a moderator approves it, it will appear on the ${state.destinationName} page.`}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {state.destinationSlug ? (
            <Link href={`/destinations/${state.destinationSlug}`} className={buttonClasses("secondary")}>
              Back to {state.destinationName}
            </Link>
          ) : (
            <Link href="/account" className={buttonClasses("secondary")}>
              Your stories
            </Link>
          )}
          <button type="button" onClick={onSubmitAnother} className={buttonClasses("primary")}>
            Share another story
          </button>
        </div>
      </div>
    );
  }

  const showSummary = errorEntries.length > 0 || (state.status === "error" && !clientErrors);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={validateBeforeSubmit}
      noValidate
      className="space-y-10"
    >
      {showSummary && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-accent/40 bg-accent-soft px-4 py-3 text-sm text-ink focus:outline-none"
        >
          <p className="flex items-center gap-2 font-semibold">
            <AlertCircle aria-hidden className="size-4 text-accent" />
            {state.status === "error" && !clientErrors
              ? state.message
              : "Please fix the highlighted fields."}
          </p>
          {errorEntries.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-6">
              {errorEntries.map((field) => (
                <li key={field}>
                  <a href={`#field-${field}`} className="underline underline-offset-2">
                    {errors[field]}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <input type="hidden" name="submissionKey" value={submissionKey} />
      {Object.entries(locationFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <input type="hidden" name="latitude" value={location?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={location?.longitude ?? ""} />
      {/* Honeypot for bots: hidden from people and assistive technology. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <Section title="Where">
        <Field
          id="destinationId"
          label="Destination or place"
          hint="Start typing and choose a suggestion — a RegretMap destination or any real place."
          error={errors.destinationId}
          required
        >
          {(props) => (
            <LocationPicker
              id={props.id}
              invalid={props["aria-invalid"]}
              describedBy={props["aria-describedby"]}
              destinations={destinations}
              value={locationValue}
              onChange={chooseLocation}
            />
          )}
        </Field>

        <Field
          id="place"
          label="Specific place or area"
          hint="Optional — e.g. a pass, beach, trail or market."
          error={errors.place}
          count={[values.place.length, SUBMISSION_LIMITS.place.max]}
        >
          {(props) => (
            <input
              {...props}
              name="place"
              type="text"
              value={values.place}
              maxLength={SUBMISSION_LIMITS.place.max}
              onChange={(e) => update("place", e.target.value)}
              className={inputClasses}
            />
          )}
        </Field>

        <div id="field-latitude" className="scroll-mt-24">
          {!showMap ? (
            <button
              type="button"
              onClick={() => setShowMap(true)}
              disabled={!locationValue}
              className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-accent hover:underline disabled:cursor-not-allowed disabled:text-ink-muted disabled:no-underline"
            >
              <MapPin aria-hidden className="size-4" />
              Add a map pin (optional)
            </button>
          ) : (
            locationValue && (
              <div>
                <p className="mb-2 text-sm font-medium text-ink">Map pin (optional)</p>
                <ExploreMap
                  key={pinKey}
                  points={[]}
                  initialView={pinCenter ? { center: pinCenter, zoom: 11 } : undefined}
                  enableLocationPicker
                  location={location}
                  onLocationChange={(next) => {
                    setLocation(next);
                    markEdited("latitude");
                  }}
                  pickerHint="Click the map where it happened. Skip this if you only know the destination — never pin a private home."
                />
              </div>
            )
          )}
          {errors.latitude && <p className="mt-1 text-sm text-accent-hover">{errors.latitude}</p>}
        </div>
      </Section>

      <Section title="When">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="travelMonth" label="Travel month" hint="Optional" error={errors.travelMonth}>
            {(props) => (
              <select
                {...props}
                name="travelMonth"
                value={values.travelMonth}
                onChange={(e) => update("travelMonth", e.target.value)}
                className={inputClasses}
              >
                <option value="">Not specified</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {formatTravelMonth(i + 1)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field id="travelYear" label="Travel year" hint="Optional" error={errors.travelYear}>
            {(props) => (
              <input
                {...props}
                name="travelYear"
                type="number"
                inputMode="numeric"
                min={EARLIEST_TRAVEL_YEAR}
                placeholder="e.g. 2025"
                value={values.travelYear}
                onChange={(e) => update("travelYear", e.target.value)}
                className={inputClasses}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section title="Your story">
        <Field id="category" label="Category" error={errors.category} required>
          {(props) => (
            <select
              {...props}
              name="category"
              value={values.category}
              onChange={(e) => update("category", e.target.value)}
              className={inputClasses}
            >
              <option value="">Choose a category</option>
              {Object.entries(storyCategories).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <TextInput
          field="title"
          label="Title"
          hint="A short summary, e.g. “I underestimated the drive up”."
          values={values}
          errors={errors}
          update={update}
        />
        <TextInput
          field="body"
          label="What happened"
          hint="Describe your experience in your own words."
          rows={6}
          values={values}
          errors={errors}
          update={update}
        />
        <TextInput
          field="challenge"
          label="What went wrong or surprised you"
          values={values}
          errors={errors}
          update={update}
        />
        <TextInput
          field="lesson"
          label="What you learned"
          hint="What would you do differently?"
          values={values}
          errors={errors}
          update={update}
        />
        <TextInput
          field="advice"
          label="Advice for future travellers"
          values={values}
          errors={errors}
          update={update}
        />
      </Section>

      <div id="field-consent" className="scroll-mt-24 space-y-3 border-t border-line pt-6">
        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            name="consent"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              markEdited("consent");
            }}
            aria-invalid={Boolean(errors.consent)}
            aria-describedby="consent-hint"
            className="mt-0.5 size-4 accent-[var(--color-accent)]"
          />
          <span>
            This is my own experience, and it doesn&apos;t include names, contact details or
            private information about other people.
          </span>
        </label>
        <p id="consent-hint" className="text-xs text-ink-muted">
          Stories are shown anonymously. Every story is reviewed before it&apos;s published,
          and publishing doesn&apos;t mean it has been verified.
        </p>
        {errors.consent && <p className="text-sm text-accent-hover">{errors.consent}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          aria-disabled={pending}
          className={buttonClasses("primary", "min-w-44")}
        >
          {pending ? "Submitting…" : "Submit for review"}
        </button>
        <p aria-live="polite" className="text-sm text-ink-muted">
          {pending ? "Saving your story…" : ""}
        </p>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-5">
      <legend className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

type ControlProps = {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
};

function Field({
  id,
  label,
  hint,
  error,
  required,
  count,
  children,
}: {
  id: SubmissionField;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  count?: [number, number];
  children: (props: ControlProps) => React.ReactNode;
}) {
  const base = useId();
  const hintId = hint ? `${base}-hint` : undefined;
  const errorId = error ? `${base}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="scroll-mt-24">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={`field-${id}`} className="text-sm font-medium text-ink">
          {label}
          {required && <span className="text-accent"> *</span>}
        </label>
        {count && (
          <span className={`text-xs ${count[0] > count[1] ? "text-accent-hover" : "text-ink-muted"}`}>
            {count[0]} / {count[1]}
          </span>
        )}
      </div>
      {hint && (
        <p id={hintId} className="mt-0.5 text-xs text-ink-muted">
          {hint}
        </p>
      )}
      <div className="mt-1.5">
        {children({
          id: `field-${id}`,
          "aria-invalid": Boolean(error),
          "aria-describedby": describedBy,
          "aria-required": required || undefined,
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-accent-hover">
          {error}
        </p>
      )}
    </div>
  );
}

function TextInput({
  field,
  label,
  hint,
  rows = 3,
  values,
  errors,
  update,
}: {
  field: "title" | "body" | "challenge" | "lesson" | "advice";
  label: string;
  hint?: string;
  rows?: number;
  values: Values;
  errors: FieldErrors;
  update: (field: keyof Values, value: string) => void;
}) {
  const { min, max } = SUBMISSION_LIMITS[field];
  return (
    <Field
      id={field}
      label={label}
      hint={hint ? `${hint} ${min}–${max} characters.` : `${min}–${max} characters.`}
      error={errors[field]}
      required
      count={[values[field].trim().length, max]}
    >
      {(props) =>
        field === "title" ? (
          <input
            {...props}
            name={field}
            type="text"
            value={values[field]}
            onChange={(e) => update(field, e.target.value)}
            className={inputClasses}
          />
        ) : (
          <textarea
            {...props}
            name={field}
            rows={rows}
            value={values[field]}
            onChange={(e) => update(field, e.target.value)}
            className={`${inputClasses} resize-y`}
          />
        )
      }
    </Field>
  );
}
