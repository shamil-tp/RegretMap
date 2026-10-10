type ButtonVariant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent px-4 py-2.5 text-white hover:bg-accent-hover",
  secondary:
    "border border-line bg-canvas px-4 py-2.5 text-ink hover:bg-surface",
  ghost: "px-3 py-2 text-ink-muted hover:bg-surface hover:text-ink",
};

/** Shared button styling for both <button> and <a>/<Link> elements. */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  className = "",
) {
  return `${base} ${variants[variant]} ${className}`.trim();
}
