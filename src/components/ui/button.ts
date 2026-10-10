type ButtonVariant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent px-5 py-2.5 text-white shadow-sm hover:bg-accent-hover",
  secondary:
    "border border-line bg-card px-5 py-2.5 text-ink hover:border-coral hover:bg-strawberry/40",
  ghost: "px-3 py-2 text-ink-muted hover:bg-surface hover:text-ink",
};

/** Shared button styling for both <button> and <a>/<Link> elements. */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  className = "",
) {
  return `${base} ${variants[variant]} ${className}`.trim();
}
