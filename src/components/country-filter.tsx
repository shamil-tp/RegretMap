"use client";

import { Globe2, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { pluralize, type CountrySummary } from "@/lib/stories";

/**
 * Country picker for the Explore page. The choice lives in the URL
 * (?country=…), so the server loads only that country's stories and the
 * view can be shared or bookmarked.
 */
export function CountryFilter({
  countries,
  selected,
  totalCount,
}: {
  countries: CountrySummary[];
  selected: string | null;
  totalCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const id = useId();

  function choose(country: string) {
    const url = country ? `${pathname}?country=${encodeURIComponent(country)}` : pathname;
    startTransition(() => router.push(url, { scroll: false }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={id} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
        <Globe2 aria-hidden className="size-4 text-accent" />
        Country
      </label>
      <select
        id={id}
        value={selected ?? ""}
        onChange={(event) => choose(event.target.value)}
        disabled={pending}
        className="min-h-10 max-w-full rounded-full border border-line bg-card px-4 py-2 text-sm text-ink shadow-sm focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/30 disabled:opacity-60"
      >
        <option value="">All countries ({pluralize(totalCount, "story", "stories")})</option>
        {countries.map((c) => (
          <option key={c.country} value={c.country}>
            {c.country} ({c.storyCount})
          </option>
        ))}
      </select>
      {pending && (
        <span role="status" className="inline-flex items-center gap-1 text-sm text-ink-muted">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Loading…
        </span>
      )}
    </div>
  );
}
