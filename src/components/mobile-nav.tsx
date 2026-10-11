"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/**
 * Mobile menu. Always mounted so it can animate: it slides and fades in, links
 * stagger in, and the icon rotates between ☰ and ✕. While closed it's
 * `invisible` (hidden from screen readers and not clickable). CSS-only motion,
 * disabled for reduced-motion users by the global rule.
 */
export function MobileNav({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex size-10 items-center justify-center rounded-md text-ink hover:bg-surface"
      >
        <Menu
          aria-hidden
          className={`absolute size-5 transition-[transform,opacity] duration-200 ${
            open ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
          }`}
        />
        <X
          aria-hidden
          className={`absolute size-5 transition-[transform,opacity] duration-200 ${
            open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
          }`}
        />
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>
      <nav
        id="mobile-nav"
        aria-label="Mobile"
        onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
        className={`absolute inset-x-0 top-full z-20 origin-top border-b-[2.5px] border-black bg-card px-4 py-2 shadow-md transition-[opacity,transform,visibility] duration-200 ease-out ${
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"
        }`}
      >
        <ul>
          {links.map((link, index) => (
            <li
              key={link.href}
              className={`transition-[opacity,transform] duration-300 ease-out ${
                open ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0"
              }`}
              style={{ transitionDelay: open ? `${60 + index * 50}ms` : "0ms" }}
            >
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                tabIndex={open ? undefined : -1}
                className="block rounded-md px-3 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
