"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production only (in development it would get in the way
 * of hot reloading). `updateViaCache: "none"` plus a check whenever the tab
 * becomes visible means new deployments are picked up promptly.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;

    const onVisible = () => {
      if (document.visibilityState === "visible") registration?.update().catch(() => {});
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        registration = reg;
        document.addEventListener("visibilitychange", onVisible);
      })
      .catch(() => {
        // Not fatal: the site works normally without a service worker.
      });

    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return null;
}
