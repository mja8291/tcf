"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { countPendingSubmissions } from "@/lib/offline/db";
import { flushPendingSubmissions, SYNC_CHANGED_EVENT } from "@/lib/offline/sync";

export function PendingSyncBanner() {
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(() => {
    countPendingSubmissions().then(setCount);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(SYNC_CHANGED_EVENT, refresh);
    window.addEventListener("online", refresh);
    return () => {
      window.removeEventListener(SYNC_CHANGED_EVENT, refresh);
      window.removeEventListener("online", refresh);
    };
  }, [refresh]);

  if (count === 0) return null;

  async function syncNow() {
    setSyncing(true);
    await flushPendingSubmissions();
    setSyncing(false);
    refresh();
  }

  return (
    <div className="w-full flex items-center gap-2.5 bg-band-average-tint text-ink rounded-xl px-3.5 py-3 mb-4 text-left">
      <CloudOff size={18} className="text-band-average shrink-0" />
      <div className="flex-1 text-xs leading-snug">
        {count} survey{count === 1 ? "" : "s"} saved offline, waiting to sync.
      </div>
      <button
        type="button"
        onClick={syncNow}
        disabled={syncing}
        className="shrink-0 h-9 px-3 rounded-lg bg-white text-brand-deep text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60"
      >
        <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
        {syncing ? "Syncing…" : "Sync now"}
      </button>
    </div>
  );
}
