"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Pause, Play, Save } from "lucide-react";
import { useSurvey } from "@/lib/survey-context";
import { formatElapsedMinutes } from "@/lib/format-duration";
import { saveDraft } from "@/lib/draft";

function computeElapsed(startTime: string, pausedAt: string | null, pausedSeconds: number): number {
  const startMs = new Date(startTime).getTime();
  const nowMs = Date.now();
  const openPauseMs = pausedAt ? nowMs - new Date(pausedAt).getTime() : 0;
  return Math.max(0, Math.round((nowMs - startMs - pausedSeconds * 1000 - openPauseMs) / 1000));
}

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Persistent bar showing elapsed time since the method was chosen (see
 * survey-context SET_METHOD), with a Pause/Resume control and — Round 3
 * Task 9 — a Save draft control. Rendered once in survey/layout.tsx so it's
 * present across the whole m1/m2/review flow without every page wiring it
 * in individually; that's also why Save draft lives here rather than on any
 * one page — "close the app and finish later" needs to work from wherever
 * the surveyor happens to be mid-assessment, not just from Review. Renders
 * nothing before a method is picked (no startTime yet) or on the Done
 * screen (assessment is over — the timer's job is done, see submit.ts for
 * the final tally).
 */
export function SurveyTimerBar() {
  const pathname = usePathname();
  const { state, pauseTimer, resumeTimer } = useSurvey();
  const paused = Boolean(state.pausedAt);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveFlashTimeoutRef.current) clearTimeout(saveFlashTimeoutRef.current);
    };
  }, []);

  async function handleSaveDraft() {
    setSaveState("saving");
    try {
      await saveDraft(state);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    } finally {
      if (saveFlashTimeoutRef.current) clearTimeout(saveFlashTimeoutRef.current);
      saveFlashTimeoutRef.current = setTimeout(() => setSaveState("idle"), 2500);
    }
  }
  // Date.now() can't be called during render (react-hooks/purity), and
  // setState can't be called synchronously in an effect body
  // (react-hooks/set-state-in-effect) — so every read of it happens inside
  // this interval's callback instead. The very first tick lands up to a
  // minute after mount/pause/resume; until then this shows the last value
  // computed, which needs no correction at mount (elapsed is ~0 the instant
  // a method is chosen) and is at worst a minute stale right after a resume.
  //
  // Deliberately once-per-minute, not once-per-second re-labeled as
  // "min" — the whole point (Task 6 addendum) is cutting the visual churn
  // of a digit changing every second, so the interval itself has to be
  // coarse, not just the formatting.
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!state.startTime || paused) return;
    const startTime = state.startTime;
    const pausedAt = state.pausedAt;
    const pausedSeconds = state.pausedSeconds;
    const id = setInterval(() => setSeconds(computeElapsed(startTime, pausedAt, pausedSeconds)), 60000);
    return () => clearInterval(id);
  }, [state.startTime, state.pausedAt, state.pausedSeconds, paused]);

  if (!state.startTime || pathname === "/survey/done") return null;

  return (
    <div className="w-full max-w-md mx-auto px-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div
        className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[12.5px] ${
          paused ? "border-band-average bg-band-average-tint text-band-average" : "border-border bg-card text-ink-soft"
        }`}
      >
        <span className="font-medium">
          {paused ? "Paused" : "Time on assessment"}
          {" · "}
          <span className={`font-display font-semibold ${paused ? "text-band-average" : "text-ink"}`}>
            {formatElapsedMinutes(seconds)}
          </span>
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saveState === "saving"}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 font-semibold text-ink-soft disabled:opacity-60"
          >
            <Save size={13} />
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Failed" : "Save draft"}
          </button>
          <button
            type="button"
            onClick={paused ? resumeTimer : pauseTimer}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 font-semibold text-ink-soft"
          >
            {paused ? <Play size={13} /> : <Pause size={13} />}
            {paused ? "Resume" : "Pause"}
          </button>
        </span>
      </div>
    </div>
  );
}
