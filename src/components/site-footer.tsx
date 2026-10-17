import Link from "next/link";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { CREATORS } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-lavender/40">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-ink-muted sm:px-6">
        <p>
          <span className="font-display font-semibold text-ink">RegretMap</span>{" "}
          — Every journey leaves a lesson.
        </p>
        <p className="mt-2 max-w-2xl">
          Community stories are personal accounts, not verified facts. Check
          official sources for current safety, weather, and transport
          information.
        </p>
        <p className="mt-2">
          <Link href="/about" className="underline hover:text-ink">
            About RegretMap
          </Link>{" "}
          · Built by{" "}
          {CREATORS.map((c, i) => (
            <span key={c.id}>
              {i > 0 && " and "}
              <a href={c.url} rel="author" className="underline hover:text-ink">
                {c.name}
              </a>
            </span>
          ))}
        </p>
        <InstallAppButton className="mt-4" />
      </div>
    </footer>
  );
}
