type BadgeTone = "neutral" | "accent" | "demo" | "mint" | "sky" | "butter" | "lavender" | "peach";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-card text-black",
  accent: "bg-highlight text-black",
  mint: "bg-go text-black",
  sky: "bg-sky text-black",
  butter: "bg-butter text-black",
  lavender: "bg-lavender text-black",
  peach: "bg-peach text-black",
  demo: "border-dashed text-ink-muted",
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border-2 border-black px-2.5 py-0.5 font-mono text-[0.7rem] font-bold uppercase tracking-tight ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
