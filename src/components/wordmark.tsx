import { MapPin } from "lucide-react";
import Link from "next/link";

export function Wordmark() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 rounded-md font-display text-xl font-semibold tracking-tight text-ink"
    >
      <MapPin aria-hidden className="size-5 text-accent" strokeWidth={2.5} />
      RegretMap
    </Link>
  );
}
