import type { LucideIcon } from "lucide-react";

/** Centered message for empty and error states. */
export function StateMessage({
  icon: Icon,
  title,
  description,
  tone = "neutral",
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: "neutral" | "error";
  children?: React.ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className="flex flex-col items-center px-6 py-12 text-center"
    >
      <Icon
        aria-hidden
        className={`size-8 ${tone === "error" ? "text-accent" : "text-ink-muted"}`}
      />
      <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
