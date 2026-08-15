"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Pause, Play } from "lucide-react";
import { useSurvey } from "@/lib/survey-context";
import { formatDuration } from "@/lib/format-duration";

function computeElapsed(startTime: string, pausedAt: string | null, pausedSeconds: number): number {
  const startMs = new Date(startTime).getTime();
  const nowMs = Date.now();
  const openPauseMs = pausedAt ? nowMs - new Date(pausedAt).getTime() : 0;
  return Math.max(0, Math.round((nowMs - startMs - pausedSeconds * 1000 - openPauseMs) / 1000));
}

/**
 * Persistent bar showing elapsed time since the method was chosen (see
 * survey-context SET_METHOD), with a Pause/Resume control. Rendered once in
 * survey/layout.tsx so it's present across the whole m1/m2/review flow
 * without every page wiring it in individually. Renders nothing before a
 * method is picked (no startTime yet) or on the Done screen (assessment is
 * over — the timer's job is done, see submit.ts for the final tally).
 */
export function SurveyTimerBar() {
  const pathname = usePathname();
  const { state, pauseTimer, resumeTimer } = useSurvey();
  const paused = Boolean(state.pausedAt);
  // Date.now() can't be called during render (react-hooks/purity), and
  // setState can't be called synchronously in an effect body
  // (react-hooks/set-state-in-effect) — so every read of it happens inside
  // this interval's callback instead. The very first tick lands up to a
  // second after mount/pause/resume; until then this shows the last value
  // computed, which needs no correction at mount (elapsed is ~0 the instant
  // a method is chosen) and is at worst a second stale right after a resume.
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!state.startTime || paused) return;
    const startTime = state.startTime;
    const pausedAt = state.pausedAt;
    const pausedSeconds = state.pausedSeconds;
    const id = setInterval(() => setSeconds(computeElapsed(startTime, pausedAt, pausedSeconds)), 1000);
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
            {formatDuration(seconds)}
          </span>
        </span>
        <button
          type="button"
          onClick={paused ? resumeTimer : pauseTimer}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 font-semibold text-ink-soft shrink-0"
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
          {paused ? "Resume" : "Pause"}
        </button>
      </div>
    </div>
  );
}
