"use client";

import { ArrowRight, Loader2, MapPin, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { nearestWithin } from "@/lib/geo";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import {
  fetchPlaceSuggestions,
  PLACE_QUERY_MAX,
  PLACE_QUERY_MIN,
  type PlaceSuggestion,
} from "@/lib/place-search";
import {
  isSamePlace,
  matchDestinations,
  type SearchableDestination,
} from "@/lib/location-search";
import { formatLocation, storyNoun } from "@/lib/stories";

export type { SearchableDestination };

type Option =
  | { type: "destination"; destination: SearchableDestination }
  | { type: "place"; place: PlaceSuggestion };

/**
 * Destination search with autocomplete. Destinations that have stories are
 * listed first and open their page; other places come from the place-search
 * provider and are clearly marked as having no stories yet.
 */
/** How far away a destination with stories can be to be suggested for a chosen place. */
const NEARBY_KM = 150;

export function DestinationSearch({
  destinations,
  placeholder = "Where are you heading?",
  size = "md",
}: {
  destinations: SearchableDestination[];
  placeholder?: string;
  /** "lg" for the home page hero. */
  size?: "md" | "lg";
}) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [placeError, setPlaceError] = useState("");
  /** The query the current `places` were fetched for. */
  const [placesQuery, setPlacesQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [statusMessage, setStatusMessage] = useState("");
  /** Closest destination with stories to a chosen place that has none. */
  const [nearby, setNearby] = useState<{ slug: string; name: string; km: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  const localMatches = useMemo(
    () => matchDestinations(destinations, trimmed),
    [destinations, trimmed],
  );
  const otherPlaces = useMemo(
    () => places.filter((place) => !destinations.some((d) => isSamePlace(place, d))),
    [places, destinations],
  );
  const options: Option[] = [
    ...localMatches.map((destination) => ({ type: "destination" as const, destination })),
    ...otherPlaces.map((place) => ({ type: "place" as const, place })),
  ];

  // Debounced place autocomplete via our own API route.
  useEffect(() => {
    if (trimmed.length < PLACE_QUERY_MIN) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      const result = await fetchPlaceSuggestions(trimmed, controller.signal);
      if (controller.signal.aborted) return;
      setPlaces(result.suggestions);
      setPlacesQuery(trimmed);
      setPlaceError(result.error ?? "");
      setIsLoading(false);
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  // This input is streamed in before React attaches, so text typed in that gap
  // exists only in the DOM. Adopt it once on mount so it isn't silently ignored.
  useEffect(() => {
    const input = inputRef.current;
    const typed = input?.value ?? "";
    if (typed) {
      setQuery(typed);
      setIsOpen(document.activeElement === input && typed.trim().length > 0);
    }
  }, []);

  // Close the list when clicking outside.
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setQuery(next);
    setActiveIndex(-1);
    setStatusMessage("");
    setNearby(null);
    setIsOpen(next.trim().length > 0);
    if (next.trim().length < PLACE_QUERY_MIN) {
      setPlaces([]);
      setPlaceError("");
      setIsLoading(false);
    }
  }

  function choose(option: Option) {
    setIsOpen(false);
    setActiveIndex(-1);
    if (option.type === "destination") {
      setQuery(option.destination.name);
      router.push(`/destinations/${option.destination.slug}`);
      return;
    }
    const { place } = option;
    setQuery(place.name);
    const closest = nearestWithin(
      destinations.filter((d) => (d.storyCount ?? 0) > 0),
      { latitude: place.latitude, longitude: place.longitude },
      NEARBY_KM,
    );
    setNearby(closest ? { slug: closest.item.slug, name: closest.item.name, km: Math.round(closest.km) } : null);
    setStatusMessage(`No stories for ${place.name}${place.context ? ` (${place.context})` : ""} yet.`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (options.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (event.key === "Enter" && isOpen && activeIndex >= 0) {
      event.preventDefault();
      choose(options[activeIndex]);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmed) {
      setStatusMessage("Enter a destination to search.");
      return;
    }
    if (localMatches.length > 0) {
      choose({ type: "destination", destination: localMatches[0] });
      return;
    }
    setIsOpen(false);
    setStatusMessage(
      destinations.length > 0
        ? `No destinations with stories match “${trimmed}” yet. Try ${destinations
            .map((d) => d.name)
            .join(", ")}.`
        : `No destinations with stories match “${trimmed}” yet.`,
    );
  }

  function handleClear() {
    setQuery("");
    setPlaces([]);
    setPlaceError("");
    setIsOpen(false);
    setStatusMessage("");
    inputRef.current?.focus();
  }

  const optionId = (index: number) => `${listId}-option-${index}`;
  const showEmpty =
    options.length === 0 &&
    (trimmed.length < PLACE_QUERY_MIN || (placesQuery === trimmed && !isLoading && !placeError));

  function renderOption(option: Option, index: number) {
    const active = index === activeIndex;
    const isDestination = option.type === "destination";
    const name = isDestination ? option.destination.name : option.place.name;
    const detail = isDestination
      ? formatLocation(option.destination)
      : option.place.context;
    return (
      <li
        key={isDestination ? option.destination.slug : option.place.id}
        id={optionId(index)}
        role="option"
        aria-selected={active}
        onMouseEnter={() => setActiveIndex(index)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => choose(option)}
        className={`flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 ${
          active ? "bg-surface" : ""
        }`}
      >
        <MapPin
          aria-hidden
          className={`mt-0.5 size-4 shrink-0 ${isDestination ? "text-accent" : "text-ink-muted"}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-ink">{name}</span>
          {detail && <span className="block truncate text-xs text-ink-muted">{detail}</span>}
        </span>
        <span className="shrink-0 self-center text-xs text-ink-muted">
          {isDestination ? (
            <span className="inline-flex items-center gap-1 text-accent-hover">
              {storyNoun(option.destination.storyCount ?? 0, option.destination.isDemo ?? false)}
              <ArrowRight aria-hidden className="size-3.5" />
            </span>
          ) : (
            <span className="capitalize">{option.place.kind}</span>
          )}
        </span>
      </li>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <form role="search" onSubmit={handleSubmit}>
        <label htmlFor="destination-search" className="sr-only">
          Search a destination
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            />
            <input
              ref={inputRef}
              id="destination-search"
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isOpen}
              aria-controls={listId}
              aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
              value={query}
              onChange={handleInputChange}
              onFocus={() => trimmed && setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={PLACE_QUERY_MAX}
              autoComplete="off"
              className={`w-full rounded-full border border-line bg-card pl-10 pr-10 text-ink shadow-sm transition-[box-shadow,border-color] duration-200 placeholder:text-ink-muted focus:border-coral focus:shadow-md focus:outline-none focus:ring-4 focus:ring-coral/20 ${
                size === "lg" ? "py-4 text-base sm:text-lg" : "py-3 text-sm"
              }`}
            />
            <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center">
              {isLoading ? (
                <Loader2 aria-hidden className="size-4 animate-spin text-ink-muted" />
              ) : (
                query && (
                  <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Clear search"
                    className="rounded p-0.5 text-ink-muted hover:bg-surface hover:text-ink"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                )
              )}
            </div>
          </div>
          <button type="submit" className={buttonClasses("primary")}>
            Search
          </button>
        </div>
      </form>

      {isOpen && (
        <div className="absolute inset-x-0 top-full z-50 mt-1.5 max-h-96 overflow-y-auto rounded-lg border border-line bg-card p-1.5 shadow-lg">
          <ul id={listId} role="listbox" aria-label="Destination suggestions">
            {localMatches.length > 0 && (
              <li role="presentation" className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Destinations with stories
              </li>
            )}
            {options.map((option, index) =>
              option.type === "destination" ? renderOption(option, index) : null,
            )}
            {otherPlaces.length > 0 && (
              <li role="presentation" className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Other places — no stories yet
              </li>
            )}
            {options.map((option, index) =>
              option.type === "place" ? renderOption(option, index) : null,
            )}
          </ul>

          {showEmpty && (
            <p className="px-3 py-4 text-center text-sm text-ink-muted">
              No matching places for “{trimmed}”.
            </p>
          )}
          {placeError && (
            <p className="px-3 py-2 text-xs text-ink-muted">{placeError}</p>
          )}
          {otherPlaces.length > 0 && (
            <p className="border-t border-line px-3 pb-1 pt-2 text-[11px] text-ink-muted">
              Place search by{" "}
              <a href="https://photon.komoot.io" target="_blank" rel="noopener noreferrer" className="underline">
                Photon
              </a>{" "}
              · ©{" "}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
                OpenStreetMap
              </a>{" "}
              contributors
            </p>
          )}
        </div>
      )}

      <p aria-live="polite" className="mt-2 min-h-5 text-sm text-ink-muted">
        {statusMessage}
        {statusMessage && nearby && (
          <>
            {" "}
            <Link href={`/destinations/${nearby.slug}`} className="font-medium text-accent hover:underline">
              See {nearby.name}
            </Link>{" "}
            ({nearby.km} km away) or
          </>
        )}
        {statusMessage && (
          <>
            {" "}
            <Link href="/submit" className="font-medium text-accent hover:underline">
              share the first story
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
