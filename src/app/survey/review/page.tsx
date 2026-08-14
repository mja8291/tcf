"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { TopBar } from "@/components/ui/TopBar";
import { Gauge } from "@/components/ui/Gauge";
import { CategoryBar } from "@/components/ui/CategoryBar";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { BottomBar } from "@/components/ui/BottomBar";
import { useSurvey } from "@/lib/survey-context";
import { CATEGORIES, CRITICAL_ITEMS, ratingBand, scoreMethod1, scoreMethod2 } from "@/lib/scoring";
import { isMethod2LocationComplete } from "@/lib/data/method2-items";
import { OATH_TEXT, POWER_SUPPLY_OPTIONS } from "@/lib/data/content";
import type { PowerSupply } from "@/lib/types";
import { buildSubmission, formDataFromSubmission } from "@/lib/submit";
import { queueSubmission } from "@/lib/offline/db";
import { formatDuration } from "@/components/survey/SurveyTimerBar";

export default function ReviewPage() {
  const router = useRouter();
  const { state, setPowerSupply, setComplaints, setLastSurveyId } = useSurvey();
  const [powerSupply, setLocalPowerSupply] = useState<PowerSupply | "">(state.powerSupply);
  const [complaints, setLocalComplaints] = useState(state.complaints);
  const [oath, setOath] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.school || !state.method) {
      router.replace("/survey/find-school");
      return;
    }
    // Defense in depth — the Floor Level page already blocks navigating here
    // with an incomplete location, but don't trust only client-side button
    // state to guarantee that (e.g. a direct URL visit).
    if (state.method === 2) {
      const incomplete = state.m2.locations.length === 0 || state.m2.locations.some((l) => !isMethod2LocationComplete(l));
      if (incomplete) router.replace("/survey/m2");
    }
  }, [state.school, state.method, state.m2.locations, router]);

  const result = useMemo(
    () => (state.method === 1 ? scoreMethod1(state.m1.scores) : scoreMethod2(state.m2.locations)),
    [state.method, state.m1.scores, state.m2.locations]
  );

  // A snapshot, not a live tick — Date.now() can't be called during render
  // (react-hooks/purity), and setState can't be called synchronously in an
  // effect body (react-hooks/set-state-in-effect), so the read+set is
  // deferred a microtask out via queueMicrotask. This recap row doesn't need
  // to update every second the way the persistent timer bar does.
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);
  useEffect(() => {
    if (!state.startTime) {
      queueMicrotask(() => setElapsedSeconds(null));
      return;
    }
    const startTime = state.startTime;
    const pausedAt = state.pausedAt;
    const pausedSeconds = state.pausedSeconds;
    queueMicrotask(() => {
      const pausedTotal = pausedSeconds + (pausedAt ? (Date.now() - new Date(pausedAt).getTime()) / 1000 : 0);
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - new Date(startTime).getTime()) / 1000 - pausedTotal)));
    });
  }, [state.startTime, state.pausedAt, state.pausedSeconds]);

  if (!state.school || !state.method) return null;

  const band = ratingBand(result.overall);
  const canSubmit = oath && Boolean(powerSupply) && !submitting;

  async function submit() {
    if (!canSubmit || !powerSupply || !state.school || !state.method) return;
    setSubmitting(true);
    setError(null);
    setPowerSupply(powerSupply);
    setComplaints(complaints);

    const submission = buildSubmission(
      { ...state, school: state.school, method: state.method, powerSupply, complaints },
      result
    );

    let res: Response;
    try {
      res = await fetch("/api/submit", { method: "POST", body: formDataFromSubmission(submission) });
    } catch {
      // Couldn't reach the server at all — treat as offline. Queue it locally
      // and sync automatically once connectivity returns (see PwaBootstrap).
      await queueSubmission(submission);
      router.push("/survey/done?queued=1");
      return;
    }
    if (!res.ok) {
      setError("Couldn't submit the survey. Check your connection and try again.");
      setSubmitting(false);
      return;
    }
    setLastSurveyId(submission.payload.surveyId);
    router.push("/survey/done");
  }

  return (
    <ScreenShell>
      <TopBar
        title="Review and submit"
        onBack={() => router.push(state.method === 1 ? "/survey/m1" : "/survey/m2")}
      />

      <div className="space-y-0.5 mb-4">
        <RecapRow k="School" v={state.school.name} />
        <RecapRow k="Method" v={`Method ${state.method}`} />
        <RecapRow k="Accompanying APM" v={state.apm || "—"} />
        <RecapRow k="Responding ASM" v={state.asm || "—"} />
        <RecapRow k="School Principal" v={state.principal || "—"} />
        {state.method === 2 ? <RecapRow k="Locations recorded" v={String(state.m2.locations.length)} /> : null}
        {elapsedSeconds !== null ? <RecapRow k="Time on assessment" v={formatDuration(elapsedSeconds)} /> : null}
      </div>

      <div className="rounded-2xl bg-brand-deep text-white p-4.5 text-center mb-4">
        <div className="text-xs opacity-75 mb-1">Overall MQI score</div>
        <div className="font-display text-[32px] font-semibold">
          {result.overall === null ? "—" : `${Math.round(result.overall)}%`}
          {band ? <span className="text-base font-normal opacity-80 ml-2">{band}</span> : null}
        </div>
      </div>

      <div className="flex items-center gap-3.5 mb-4">
        <Gauge score={result.overall} size={64} />
        <div className="flex-1">
          {CATEGORIES.map((cat) => (
            <CategoryBar key={cat} category={cat} score={result.categories[cat].score} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-[11px] text-ink-faint mb-0.5">Major score (Engineering)</div>
          <div className="font-display text-lg font-semibold text-brand-deep">
            {result.major === null ? "—" : `${Math.round(result.major)}%`}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-[11px] text-ink-faint mb-0.5">Minor score (School staff)</div>
          <div className="font-display text-lg font-semibold text-brand-deep">
            {result.minor === null ? "—" : `${Math.round(result.minor)}%`}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs font-semibold text-brand-deep uppercase tracking-wide mb-2">Critical items</div>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {CRITICAL_ITEMS.map((name) => {
            const score = result.criticalItems[name];
            return (
              <div key={name} className="flex justify-between items-center px-3.5 py-2.5 text-[13px]">
                <span className="text-ink-soft">{name.replace(" *", "")}</span>
                <span className="font-semibold text-ink">{score === null ? "—" : `${Math.round(score)}%`}</span>
              </div>
            );
          })}
        </div>
      </div>

      <Field label="Power supply">
        <select
          value={powerSupply}
          onChange={(e) => setLocalPowerSupply(e.target.value as PowerSupply)}
          className="w-full rounded-[10px] border border-border bg-white px-3 py-3 text-base text-ink"
        >
          <option value="">Select power supply</option>
          {POWER_SUPPLY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Major complaints or additional remarks">
        <textarea
          rows={3}
          placeholder="Anything not captured item-by-item"
          value={complaints}
          onChange={(e) => setLocalComplaints(e.target.value)}
          className="w-full rounded-[10px] border border-border bg-white px-3 py-3 text-base text-ink"
        />
      </Field>

      <label className="flex items-start gap-2.5 text-xs text-ink-soft leading-relaxed mt-2">
        <input
          type="checkbox"
          checked={oath}
          onChange={(e) => setOath(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand)]"
        />
        {OATH_TEXT}
      </label>

      {error ? <p className="text-xs text-band-poor mt-3">{error}</p> : null}

      <BottomBar>
        <Button disabled={!canSubmit} onClick={submit}>
          {submitting ? "Submitting…" : "Submit survey"}
        </Button>
      </BottomBar>
    </ScreenShell>
  );
}

function RecapRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-[13px] py-2 border-b border-border">
      <span className="text-ink-faint">{k}</span>
      <span>{v}</span>
    </div>
  );
}
