"use client";

import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * A small notice shown ONLY while the browser reports being offline. Nothing
 * is rendered when online (or during server rendering).
 */
export function ConnectionStatus() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-3 z-[1200] mx-auto flex max-w-md animate-pop-in items-start gap-2 rounded-md border-[2.5px] border-black bg-highlight px-4 py-3 text-sm text-black shadow-md sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
    >
      <WifiOff aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="font-bold">You&apos;re offline.</span> Live stories, AI answers, sign-in and
        posting need a connection — they&apos;ll work again once you reconnect.
      </p>
    </div>
  );
}
