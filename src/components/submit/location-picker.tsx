"use client";

import { Loader2, MapPin, MapPinPlus, X } from "lucide-react";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { nearestWithin } from "@/lib/geo";
import { isSamePlace, matchDestinations } from "@/lib/location-search";
import {
  fetchPlaceSuggestions,
  PLACE_QUERY_MAX,
  PLACE_QUERY_MIN,
  type PlaceSuggestion,
} from "@/lib/place-search";
import { formatLocation, type Coordinates } from "@/lib/stories";

export type PickerDestination = {
  id: string;
  slug: string;
  name: string;
  region?: string;
  country?: string;
  coordinates?: Coordinates;
};

/** What the user confirmed by choosing a suggestion. */
export type LocationValue =
  | { type: "destination"; destination: PickerDestination }
  | { type: "place"; place: PlaceSuggestion };

/** Must match ATTACH_RADIUS_KM on the server (preview only; the server decides). */
const ATTACH_PREVIEW_KM = 50;

type Option =
  | { type: "destination"; destination: PickerDestination }
  | { type: "place"; place: PlaceSuggestion };

export function labelFor(value: LocationValue) {
  return value.type === "destination" ? value.destination.name : value.place.name;
}

export function LocationPicker({
  id,
  destinations,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id: string;
  destinations: PickerDestination[];
  value: LocationValue | null;
  onChange: (value: LocationValue | null) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const listId = useId();
  const [query, setQuery] = useState(() => (value ? labelFor(value) : ""));
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [placesQuery, setPlacesQuery] = useState("");
  const [placeError, setPlaceError] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const searching = open && !value;
  const local = useMemo(
    () => (searching ? matchDestinations(destinations, trimmed).slice(0, 5) : []),
    [destinations, trimmed, searching],
  );
  const external = useMemo(
    () => (searching ? places.filter((p) => !destinations.some((d) => isSamePlace(p, d))) : []),
    [places, destinations, searching],
  );
  const options: Option[] = [
    ...local.map((destination) => ({ type: "destination" as const, destination })),
    ...external.map((place) => ({ type: "place" as const, place })),
  ];

  // Debounced place search; aborted requests can't overwrite newer results.
  useEffect(() => {
    if (value || trimmed.length < PLACE_QUERY_MIN) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      const result = await fetchPlaceSuggestions(trimmed, controller.signal);
      if (controller.signal.aborted) return;
      setPlaces(result.suggestions);
      setPlacesQuery(trimmed);
      setPlaceError(result.error ?? "");
      setLoading(false);
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, value]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function handleInput(next: string) {
    setQuery(next);
    setActive(-1);
    setOpen(next.trim().length > 0);
    // Editing the text invalidates any earlier choice (and its coordinates).
    if (value) onChange(null);
    if (next.trim().length < PLACE_QUERY_MIN) {
      setPlaces([]);
      setPlaceError("");
      setLoading(false);
    }
  }

  function choose(option: Option) {
    const next: LocationValue =
      option.type === "destination"
        ? { type: "destination", destination: option.destination }
        : { type: "place", place: option.place };
    setQuery(labelFor(next));
    setOpen(false);
    setActive(-1);
    onChange(next);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (options.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (event.key === "Enter" && open && active >= 0) {
      event.preventDefault();
      choose(options[active]);
    }
  }

  const optionId = (index: number) => `${listId}-${index}`;
  const showEmpty =
    searching &&
    options.length === 0 &&
    !loading &&
    (trimmed.length < PLACE_QUERY_MIN || (placesQuery === trimmed && !placeError));

  // Preview where the story will be filed (the server makes the final decision).
  const preview = useMemo(() => {
    if (!value) return null;
    if (value.type === "destination") {
      return { icon: MapPin, text: `Shared under ${value.destination.name}.` };
    }
    const near = nearestWithin(
      destinations,
      { latitude: value.place.latitude, longitude: value.place.longitude },
      ATTACH_PREVIEW_KM,
    );
    return near
      ? {
          icon: MapPin,
          text: `Shared under ${near.item.name} (${Math.max(1, Math.round(near.km))} km away), pinned at ${value.place.name}.`,
        }
      : {
          icon: MapPinPlus,
          text: `${value.place.name} isn't on RegretMap yet — it will be proposed as a new destination and appear once a moderator approves your story.`,
        };
  }, [value, destinations]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
        />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={searching && (options.length > 0 || showEmpty)}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => trimmed && !value && setOpen(true)}
          onKeyDown={handleKeyDown}
          maxLength={PLACE_QUERY_MAX}
          autoComplete="off"
          placeholder="Search a destination or place, e.g. Manali, Baga Beach"
          className="w-full rounded-md border border-line bg-canvas py-2.5 pl-9 pr-10 text-sm text-ink placeholder:text-ink-muted focus:border-ink-muted aria-[invalid=true]:border-accent"
        />
        <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center">
          {loading ? (
            <Loader2 aria-hidden className="size-4 animate-spin text-ink-muted" />
          ) : (
            query && (
              <button
                type="button"
                onClick={() => handleInput("")}
                aria-label="Clear location"
                className="rounded p-0.5 text-ink-muted hover:bg-surface hover:text-ink"
              >
                <X aria-hidden className="size-4" />
              </button>
            )
          )}
        </div>
      </div>

      {searching && (options.length > 0 || showEmpty || placeError) && (
        <div className="absolute inset-x-0 top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-lg border border-line bg-canvas p-1 shadow-lg">
          <ul id={listId} role="listbox" aria-label="Location suggestions">
            {local.length > 0 && (
              <li role="presentation" className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                RegretMap destinations
              </li>
            )}
            {options.map((option, index) => {
              const isDestination = option.type === "destination";
              const name = isDestination ? option.destination.name : option.place.name;
              const detail = isDestination ? formatLocation(option.destination) : option.place.context;
              return (
                <Fragment key={isDestination ? option.destination.id : option.place.id}>
                  {!isDestination && index === local.length && (
                    <li role="presentation" className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Places
                    </li>
                  )}
                  <li
                    id={optionId(index)}
                    role="option"
                    aria-selected={index === active}
                    onMouseEnter={() => setActive(index)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(option)}
                    className={`flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 ${index === active ? "bg-surface" : ""}`}
                  >
                    <MapPin
                      aria-hidden
                      className={`mt-0.5 size-4 shrink-0 ${isDestination ? "text-accent" : "text-ink-muted"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{name}</span>
                      {detail && <span className="block truncate text-xs text-ink-muted">{detail}</span>}
                    </span>
                    {!isDestination && (
                      <span className="shrink-0 self-center text-xs capitalize text-ink-muted">
                        {option.place.kind}
                      </span>
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ul>
          {showEmpty && (
            <p className="px-3 py-3 text-sm text-ink-muted">No matching places for “{trimmed}”.</p>
          )}
          {placeError && <p className="px-3 py-2 text-xs text-ink-muted">{placeError}</p>}
          {external.length > 0 && (
            <p className="border-t border-line px-3 pb-1 pt-2 text-[11px] text-ink-muted">
              Place search by Photon · © OpenStreetMap contributors
            </p>
          )}
        </div>
      )}

      <p aria-live="polite" className="mt-1.5 min-h-5 text-xs text-ink-muted">
        {preview && (
          <span className="inline-flex items-start gap-1">
            <preview.icon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-accent" />
            {preview.text}
          </span>
        )}
      </p>
    </div>
  );
}
