import Image from "next/image";
import type { DestinationImage } from "@/lib/destination-images";

/**
 * A destination photo with its Commons credit. `fill` mode: the parent sets
 * the size (keeps layout stable while the image loads). Without a photo, a
 * calm pastel panel is shown instead of any placeholder imagery.
 */
export function DestinationPhoto({
  image,
  alt,
  sizes,
  priority = false,
  className = "",
  showCredit = true,
}: {
  image: DestinationImage | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  showCredit?: boolean;
}) {
  if (!image) return <div aria-hidden className={`bg-sky/60 ${className}`} />;
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={image.src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      {showCredit && (
        <a
          href={image.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-1 right-1 z-10 max-w-[90%] truncate rounded bg-ink/55 px-1.5 py-0.5 text-[10px] leading-tight text-white hover:bg-ink/80"
        >
          Photo: {image.author} · {image.licence}
        </a>
      )}
    </div>
  );
}
