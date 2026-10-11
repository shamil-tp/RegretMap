"use client";

import { Download, Share, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

/** Chromium's install event (not in the standard DOM typings). */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/*
 * One shared install store for the whole page. `beforeinstallprompt` fires
 * once, early — often before a menu containing the button is even open — so
 * it's captured here at module load and every button reads the same state.
 */
type InstallState = { prompt: BeforeInstallPromptEvent | null; installed: boolean };
let state: InstallState = { prompt: null, installed: false };
const listeners = new Set<() => void>();
const emit = (next: Partial<InstallState>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // keep the browser's mini-infobar from appearing on its own
    emit({ prompt: event as BeforeInstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => emit({ installed: true, prompt: null }));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const SERVER_STATE: InstallState = { prompt: null, installed: false };

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
}

const noopSubscribe = () => () => {};

/**
 * "Install app" — shown only when installation is actually possible:
 *  - Chromium browsers: after `beforeinstallprompt`; opens the native prompt.
 *  - iOS Safari: shows the Share → Add to Home Screen steps (no API exists there).
 *  - Nothing when already installed / running standalone, or unsupported.
 * No success message is invented: the button just disappears once the browser
 * reports the app was installed.
 */
export function InstallAppButton({ className = "" }: { className?: string }) {
  const install = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
  const standalone = useSyncExternalStore(noopSubscribe, isStandalone, () => false);
  const ios = useSyncExternalStore(noopSubscribe, isIosSafari, () => false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (standalone || install.installed || (!install.prompt && !ios)) return null;

  async function onClick() {
    const prompt = install.prompt;
    if (!prompt) {
      setShowIosHelp((value) => !value);
      return;
    }
    await prompt.prompt();
    await prompt.userChoice.catch(() => null);
    // The event can only be used once; the browser fires a new one if allowed.
    emit({ prompt: null });
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        aria-expanded={install.prompt ? undefined : showIosHelp}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 border-black bg-card px-3 font-mono text-xs font-bold text-ink transition-colors hover:bg-highlight"
      >
        <Download aria-hidden className="size-3.5" />
        Install app
      </button>
      {showIosHelp && (
        <p
          role="note"
          className="mt-2 flex max-w-xs animate-pop-in items-start gap-2 rounded-md border-2 border-black bg-card p-3 text-xs text-ink shadow-sm"
        >
          <Share aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            In Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
          </span>
          <button
            type="button"
            onClick={() => setShowIosHelp(false)}
            className="ml-auto rounded p-0.5 text-ink-muted hover:text-ink"
          >
            <X aria-hidden className="size-3.5" />
            <span className="sr-only">Close</span>
          </button>
        </p>
      )}
    </div>
  );
}
