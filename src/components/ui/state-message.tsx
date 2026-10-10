import type { LucideIcon } from "lucide-react";

/** Centered message for empty and error states. */
export function StateMessage({
  icon: Icon,
  title,
  description,
  tone = "neutral",
  headingLevel = "h3",
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: "neutral" | "error";
  /** Use "h1" when the message is the whole page (not-found, error pages). */
  headingLevel?: "h1" | "h2" | "h3";
  children?: React.ReactNode;
}) {
  const Heading = headingLevel;
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className="flex flex-col items-center px-6 py-12 text-center"
    >
      <Icon
        aria-hidden
        className={`size-8 ${tone === "error" ? "text-accent" : "text-ink-muted"}`}
      />
      <Heading className="mt-3 text-base font-semibold text-ink">{title}</Heading>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
