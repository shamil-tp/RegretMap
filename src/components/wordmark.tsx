import Link from "next/link";

/** "RM" stamp + wordmark (design spec §6.1). */
export function Wordmark() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2 rounded-md" aria-label="RegretMap home">
      <span
        aria-hidden
        className="rounded-[10px] border-[2.5px] border-black bg-regret px-2 py-0.5 font-display text-sm font-bold text-white shadow-xs transition-transform duration-150 group-hover:-rotate-6"
      >
        RM
      </span>
      <span className="font-display text-lg font-bold uppercase tracking-tight text-ink">Regret Map</span>
    </Link>
  );
}
