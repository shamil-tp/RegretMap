"use client";

import { AlertCircle, Check, Loader2, MapPin, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { fetchPlaceSuggestions, type PlaceSuggestion } from "@/lib/geoapify";

interface DestinationSearchProps {
  onSelect?: (place: PlaceSuggestion) => void;
}

export function DestinationSearch({ onSelect }: DestinationSearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [missingKey, setMissingKey] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced autocomplete fetch
  useEffect(() => {
    const trimmed = query.trim();

    if (
      trimmed.length < 2 ||
      (selectedPlace && query === selectedPlace.formatted)
    ) {
      return;
    }

    const abortController = new AbortController();

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetchPlaceSuggestions(trimmed, abortController.signal);
        setMissingKey(Boolean(res.missingKey));
        setSuggestions(res.suggestions || []);
        setIsOpen(true);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [query, selectedPlace]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextVal = event.target.value;
    setQuery(nextVal);
    if (selectedPlace) {
      setSelectedPlace(null);
    }
    if (nextVal.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      setActiveIndex(-1);
    }
  }

  function handleSelect(place: PlaceSuggestion) {
    setSelectedPlace(place);
    setQuery(place.formatted);
    setIsOpen(false);
    setActiveIndex(-1);
    setStatusMessage(
      `Selected destination: ${place.name} (${place.state ? `${place.state}, ` : ""}${place.country || ""}) · Coordinates: ${place.lat.toFixed(4)}°, ${place.lon.toFixed(4)}°`,
    );
    onSelect?.(place);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) {
      if (event.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true);
        setActiveIndex(0);
        event.preventDefault();
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case "Enter":
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          event.preventDefault();
          handleSelect(suggestions[activeIndex]);
        }
        break;
      case "Escape":
        event.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  function handleClear() {
    setQuery("");
    setSelectedPlace(null);
    setSuggestions([]);
    setIsOpen(false);
    setStatusMessage("");
    inputRef.current?.focus();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedPlace) {
      setStatusMessage(
        `Exploring stories and tips for “${selectedPlace.name}” (${selectedPlace.formatted}).`,
      );
      return;
    }

    const destination = query.trim();
    if (!destination) {
      setStatusMessage("Enter a destination to search.");
      return;
    }

    setStatusMessage(`Searching destination records for “${destination}”...`);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <form role="search" onSubmit={handleSubmit} className="w-full">
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
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isOpen}
              aria-controls="destination-autocomplete-list"
              aria-activedescendant={
                activeIndex >= 0 ? `suggestion-item-${activeIndex}` : undefined
              }
              value={query}
              onChange={handleInputChange}
              onFocus={() => {
                if (suggestions.length > 0 || query.trim().length >= 2) {
                  setIsOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Try Manali, Munnar, Jaipur, Bali or Paris..."
              maxLength={100}
              autoComplete="off"
              className="w-full rounded-md border border-line bg-canvas py-2.5 pl-9 pr-10 text-sm text-ink placeholder:text-ink-muted transition-colors focus:border-ink-muted focus:outline-none"
            />

            <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              {isLoading && (
                <Loader2
                  aria-hidden
                  className="size-4 animate-spin text-ink-muted"
                />
              )}
              {query && !isLoading && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear destination search"
                  className="rounded p-0.5 text-ink-muted hover:bg-surface hover:text-ink focus:outline-none"
                >
                  <X aria-hidden className="size-4" />
                </button>
              )}
            </div>
          </div>

          <button type="submit" className={buttonClasses("primary")}>
            Search
          </button>
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div
          id="destination-autocomplete-list"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-lg border border-line bg-canvas p-1 shadow-lg sm:max-w-xl"
        >
          {missingKey && (
            <div className="flex items-start gap-2 rounded-md bg-surface p-3 text-xs text-ink-muted">
              <AlertCircle
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-accent"
              />
              <div>
                <p className="font-medium text-ink">Geoapify Key Required</p>
                <p className="mt-0.5">
                  Add <code className="font-mono text-ink">GEOAPIFY_API_KEY</code> to{" "}
                  <code className="font-mono text-ink">.env.local</code> to enable
                  live global destination autocomplete.
                </p>
              </div>
            </div>
          )}

          {suggestions.length > 0 && (
            <ul className="divide-y divide-line/60">
              {suggestions.map((suggestion, index) => {
                const isSelected = activeIndex === index;
                const secondaryText = [
                  suggestion.state,
                  suggestion.country,
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <li
                    key={suggestion.id}
                    id={`suggestion-item-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleSelect(suggestion)}
                    className={`flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? "bg-surface text-ink"
                        : "text-ink hover:bg-surface"
                    }`}
                  >
                    <div className="mt-0.5 rounded-full bg-surface p-1 text-ink-muted">
                      <MapPin aria-hidden className="size-3.5 text-accent" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-ink">
                          {suggestion.name}
                        </span>
                        {suggestion.resultType && (
                          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-ink-muted">
                            {suggestion.resultType}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-ink-muted">
                        {secondaryText || suggestion.formatted}
                      </p>
                    </div>

                    {selectedPlace?.id === suggestion.id && (
                      <Check
                        aria-hidden
                        className="size-4 shrink-0 self-center text-accent"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {!isLoading && suggestions.length === 0 && !missingKey && (
            <div className="p-4 text-center text-sm text-ink-muted">
              No places found matching “{query}”. Try another spelling or city name.
            </div>
          )}
        </div>
      )}

      {/* Selected Feedback or Status Message */}
      <p aria-live="polite" className="mt-2 min-h-5 text-sm text-ink-muted">
        {statusMessage}
      </p>
    </div>
  );
}
