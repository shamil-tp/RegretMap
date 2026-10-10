type BadgeTone = "neutral" | "accent" | "demo";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface text-ink-muted",
  accent: "bg-accent-soft text-accent-hover",
  demo: "border border-dashed border-ink-muted/50 text-ink-muted",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
