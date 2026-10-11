import Image from "next/image";
import Link from "next/link";
import type { DestinationImage } from "@/lib/destination-images";

export type CollageItem = { slug: string; name: string; image: DestinationImage };

const LAYOUT = [
  "left-0 top-6 w-[58%] -rotate-6",
  "right-0 top-0 w-[52%] rotate-3",
  "left-[22%] bottom-0 w-[56%] -rotate-1",
];

/**
 * Three real destination photos laid out like postcards pinned to a travel
 * journal, joined by a dotted route. Each postcard links to its destination
 * and credits its photographer.
 */
export function HeroCollage({ items }: { items: CollageItem[] }) {
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-md">
      <svg aria-hidden viewBox="0 0 100 80" className="absolute inset-0 h-full w-full" fill="none">
        <path
          className="hero-route"
          d="M10 70 C25 40 45 65 55 38 S80 12 92 20"
          stroke="#FF7777"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeDasharray="0.6 2.6"
        />
      </svg>
      {items.slice(0, 3).map((item, i) => (
        <figure
          key={item.slug}
          className={`group absolute animate-fade-up rounded-md bg-card p-2 pb-1.5 shadow-lg ring-1 ring-line transition-transform duration-300 hover:z-20 hover:rotate-0 hover:scale-[1.03] ${LAYOUT[i]}`}
          style={{ animationDelay: `${120 + i * 90}ms` }}
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-sm">
            <Image
              src={item.image.src}
              alt={`${item.name}`}
              fill
              priority={i === 0}
              sizes="(min-width: 1024px) 260px, (min-width: 768px) 30vw, 60vw"
              className="object-cover"
            />
          </div>
          <figcaption className="mt-1.5 flex items-baseline justify-between gap-2">
            <Link
              href={`/destinations/${item.slug}`}
              className="truncate font-display text-sm font-semibold text-ink after:absolute after:inset-0 hover:text-accent-hover"
            >
              {item.name}
            </Link>
            <a
              href={item.image.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 shrink-0 text-[9px] text-ink-muted hover:underline"
              title={`Photo: ${item.image.author} (${item.image.licence})`}
            >
              {item.image.licence}
            </a>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
