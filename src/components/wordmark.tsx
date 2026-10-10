import { MapPin } from "lucide-react";
import Link from "next/link";

export function Wordmark() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 rounded-md font-display text-xl font-semibold tracking-tight text-ink"
    >
      <span aria-hidden className="grid size-8 -rotate-6 place-items-center rounded-xl bg-strawberry shadow-sm">
        <MapPin className="size-4.5 text-accent" strokeWidth={2.5} />
      </span>
      RegretMap
    </Link>
  );
}
