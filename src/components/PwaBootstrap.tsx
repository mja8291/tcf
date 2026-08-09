"use client";

import { useEffect } from "react";
import { flushPendingSubmissions } from "@/lib/offline/sync";

/** Registers the service worker and opportunistically syncs any queued offline submissions. */
export function PwaBootstrap() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support just won't be available this session — not fatal.
      });
    }

    flushPendingSubmissions();
    const onOnline = () => flushPendingSubmissions();
    const onVisible = () => {
      if (document.visibilityState === "visible") flushPendingSubmissions();
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
