"use client";

import { ChevronDown, Globe2, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { pluralize, type CountrySummary } from "@/lib/stories";

/**
 * Country picker for the Explore page. The choice lives in the URL
 * (?country=…), so the server loads only that country's stories and the
 * view can be shared or bookmarked.
 *
 * Layout: the label never shrinks; the select takes the remaining width
 * (min-w-0 so long names truncate instead of overflowing) and caps out on
 * wider screens. The native arrow is replaced by an icon in reserved padding
 * so it can't overlap the selected text.
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
    <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto">
      <label
        htmlFor={id}
        className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-ink"
      >
        <Globe2 aria-hidden className="size-4 text-accent" />
        Country
      </label>
      <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
        <select
          id={id}
          value={selected ?? ""}
          onChange={(event) => choose(event.target.value)}
          disabled={pending}
          aria-busy={pending}
          className="block min-h-10 w-full appearance-none truncate rounded-full border-2 border-line bg-card py-2 pl-4 pr-10 text-sm text-ink focus:border-black focus:bg-card focus:shadow-[4px_4px_0_0_#000] focus:outline-none disabled:opacity-60"
        >
          <option value="">All countries ({pluralize(totalCount, "story", "stories")})</option>
          {countries.map((c) => (
            <option key={c.country} value={c.country}>
              {c.country} ({c.storyCount})
            </option>
          ))}
        </select>
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-ink-muted">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ChevronDown className="size-4" />}
        </span>
      </div>
      <span role="status" className="sr-only">
        {pending ? "Loading stories for the selected country…" : ""}
      </span>
    </div>
  );
}
