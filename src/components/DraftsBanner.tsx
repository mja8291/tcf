"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileClock, X } from "lucide-react";
import { getDrafts, deleteDraft, type SurveyDraft } from "@/lib/offline/db";
import { DRAFTS_CHANGED_EVENT } from "@/lib/draft";

/** Coarse "how long ago" — this is a list of a handful of drafts at most, not worth a date-fns dependency for. */
function relativeSavedAt(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * Lists drafts saved via the Save draft control (Round 3 Task 9) so
 * reopening the app offers to resume rather than silently starting fresh.
 * Modeled on PendingSyncBanner — pure IndexedDB, no SurveyContext (the home
 * page sits outside /survey's SurveyProvider), tapping a draft navigates
 * into /survey/resume, which does have the provider, to actually load it.
 */
export function DraftsBanner() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<SurveyDraft[]>([]);

  const refresh = useCallback(() => {
    getDrafts().then(setDrafts);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(DRAFTS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DRAFTS_CHANGED_EVENT, refresh);
  }, [refresh]);

  if (drafts.length === 0) return null;

  async function discard(id: number) {
    await deleteDraft(id);
    refresh();
  }

  return (
    <div className="w-full rounded-xl border border-border bg-card mb-4 text-left overflow-hidden">
      <div className="px-3.5 pt-3 pb-1 text-xs font-semibold text-brand-deep uppercase tracking-wide">
        {drafts.length === 1 ? "1 saved draft" : `${drafts.length} saved drafts`}
      </div>
      <div className="divide-y divide-border">
        {drafts.map((d) => (
          <div key={d.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
            <FileClock size={16} className="text-ink-faint shrink-0" />
            <button
              type="button"
              onClick={() => router.push(`/survey/resume?id=${d.id}`)}
              className="flex-1 min-w-0 text-left"
            >
              <div className="text-[13px] font-medium text-ink truncate">{d.schoolName}</div>
              <div className="text-[11px] text-ink-faint">
                Method {d.method} · saved {relativeSavedAt(d.savedAt)}
              </div>
            </button>
            <button
              type="button"
              onClick={() => discard(d.id)}
              aria-label={`Discard draft for ${d.schoolName}`}
              className="shrink-0 h-8 w-8 flex items-center justify-center text-ink-faint"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
