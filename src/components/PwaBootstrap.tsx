"use client";

import { useEffect } from "react";
import { flushPendingSubmissions } from "@/lib/offline/sync";

/**
 * Explicitly asks the browser to check for a new service worker right now,
 * on top of whatever `register()` itself triggers. Confirmed directly this
 * matters: a registration left over from an earlier visit can sit on an old
 * worker for a long time — browsers throttle their own automatic update
 * checks (commonly up to ~24h) — so simply reopening the app after a fix
 * ships is not reliably enough on its own to pick it up. Every offline fix
 * this app has shipped lives entirely in sw.js; none of it does any good on
 * a device still running yesterday's installed worker.
 */
function checkForServiceWorkerUpdate() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistration().then((reg) => reg?.update().catch(() => {}));
}

/** Registers the service worker (checking for updates aggressively, not just once) and opportunistically syncs any queued offline submissions. */
export function PwaBootstrap() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => reg.update().catch(() => {}))
        .catch(() => {
          // Offline support just won't be available this session — not fatal.
        });
    }

    flushPendingSubmissions();
    const onOnline = () => {
      flushPendingSubmissions();
      checkForServiceWorkerUpdate();
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      flushPendingSubmissions();
      checkForServiceWorkerUpdate();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
