type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full font-display text-sm font-bold tracking-tight select-none disabled:cursor-not-allowed disabled:opacity-50";

/** Neo-brutal buttons: ink border + block shadow that lifts on hover and sinks on press. */
const variants: Record<ButtonVariant, string> = {
  primary: "brutal-press border-[2.5px] border-black bg-highlight px-5 py-2 text-black hover:bg-[#ffde1a]",
  secondary: "brutal-press border-[2.5px] border-black bg-card px-5 py-2 text-ink",
  danger: "brutal-press border-[2.5px] border-black bg-regret px-5 py-2 text-white",
  ghost: "rounded-full px-3 py-2 text-ink-muted transition-colors hover:bg-surface hover:text-ink",
};

/** Shared button styling for both <button> and <a>/<Link> elements. */
export function buttonClasses(variant: ButtonVariant = "primary", className = "") {
  return `${base} ${variants[variant]} ${className}`.trim();
}
