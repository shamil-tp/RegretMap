"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";

export function DestinationSearch() {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const destination = query.trim();
    setMessage(
      destination
        ? `Destination search isn't connected yet — results for “${destination}” will appear here in a later release.`
        : "Enter a destination to search.",
    );
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="w-full max-w-xl">
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
            id="destination-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try Manali, Munnar or Jaipur"
            maxLength={100}
            autoComplete="off"
            className="w-full rounded-md border border-line bg-canvas py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-ink-muted"
          />
        </div>
        <button type="submit" className={buttonClasses("primary")}>
          Search
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-sm text-ink-muted">
        {message}
      </p>
    </form>
  );
}
