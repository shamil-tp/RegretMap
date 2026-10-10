import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";
import { buttonClasses } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

const navLinks = [
  { href: "/", label: "Explore" },
  { href: "/#share", label: "Share an experience" },
];

export function SiteHeader() {
  return (
    <header className="relative border-b border-line bg-canvas">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-2">
            <li>
              <Link href="/" className={buttonClasses("ghost")}>
                Explore
              </Link>
            </li>
            <li>
              <Link href="/#share" className={buttonClasses("primary")}>
                Share an experience
              </Link>
            </li>
          </ul>
        </nav>
        <MobileNav links={navLinks} />
      </div>
    </header>
  );
}
