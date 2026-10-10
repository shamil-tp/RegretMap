type BadgeTone = "neutral" | "accent" | "demo" | "mint" | "sky" | "butter" | "lavender" | "peach";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-lavender/60 text-ink",
  accent: "bg-strawberry text-ink",
  mint: "bg-mint text-ink",
  sky: "bg-sky text-ink",
  butter: "bg-butter text-ink",
  lavender: "bg-lavender text-ink",
  peach: "bg-peach text-ink",
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
