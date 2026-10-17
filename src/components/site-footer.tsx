import { InstallAppButton } from "@/components/pwa/install-app-button";

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
          {/* Static about page in public/; a plain <a>, not a Next route. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/index.html" className="underline hover:text-ink">
            About RegretMap
          </a>{" "}
          · Built by{" "}
          <a href="https://github.com/shamil-tp" rel="author" className="underline hover:text-ink">
            Shamil TP
          </a>
        </p>
        <InstallAppButton className="mt-4" />
      </div>
    </footer>
  );
}
