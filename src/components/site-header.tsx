import Link from "next/link";
import { Suspense } from "react";
import { MobileNav } from "@/components/mobile-nav";
import { buttonClasses } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { getViewer, type Viewer } from "@/lib/supabase/session";

function linksFor(viewer: Viewer | null) {
  return [
    { href: "/", label: "Explore" },
    ...(viewer?.isModerator ? [{ href: "/moderate", label: "Moderate" }] : []),
    viewer ? { href: "/account", label: "Account" } : { href: "/auth/sign-in", label: "Sign in" },
    { href: "/submit", label: "Share an experience" },
  ];
}

function HeaderNav({ viewer }: { viewer: Viewer | null }) {
  const links = linksFor(viewer);
  return (
    <>
      <nav aria-label="Main" className="hidden md:block">
        <ul className="flex items-center gap-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={buttonClasses(link.href === "/submit" ? "primary" : "ghost")}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <MobileNav links={links} />
    </>
  );
}

async function HeaderNavForViewer() {
  return <HeaderNav viewer={await getViewer()} />;
}

export function SiteHeader() {
  return (
    <header className="relative border-b border-line bg-canvas/95">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        {/* Reading the session is per-request, so the nav streams in. */}
        <Suspense fallback={<HeaderNav viewer={null} />}>
          <HeaderNavForViewer />
        </Suspense>
      </div>
    </header>
  );
}
