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
import { CATEGORIES, ratingBand, scoreMethod1, scoreMethod2 } from "@/lib/scoring";
import { OATH_TEXT, POWER_SUPPLY_OPTIONS } from "@/lib/data/content";
import type { PowerSupply } from "@/lib/types";
import { buildSubmissionFormData } from "@/lib/submit";

export default function ReviewPage() {
  const router = useRouter();
  const { state, setPowerSupply, setComplaints } = useSurvey();
  const [powerSupply, setLocalPowerSupply] = useState<PowerSupply | "">(state.powerSupply);
  const [complaints, setLocalComplaints] = useState(state.complaints);
  const [oath, setOath] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.school || !state.method) router.replace("/survey/find-school");
  }, [state.school, state.method, router]);

  const result = useMemo(
    () => (state.method === 1 ? scoreMethod1(state.m1.scores) : scoreMethod2(state.m2.locations)),
    [state.method, state.m1.scores, state.m2.locations]
  );

  if (!state.school || !state.method) return null;

  const band = ratingBand(result.overall);
  const canSubmit = oath && Boolean(powerSupply) && !submitting;

  async function submit() {
    if (!canSubmit || !powerSupply || !state.school || !state.method) return;
    setSubmitting(true);
    setError(null);
    setPowerSupply(powerSupply);
    setComplaints(complaints);
    try {
      const formData = buildSubmissionFormData(
        { ...state, school: state.school, method: state.method, powerSupply, complaints },
        result
      );
      const res = await fetch("/api/submit", { method: "POST", body: formData });
      if (!res.ok) throw new Error(await res.text());
      router.push("/survey/done");
    } catch {
      setError("Couldn't submit the survey. Check your connection and try again.");
      setSubmitting(false);
    }
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
        <RecapRow k="Responding ASM" v={state.asm || "—"} />
        {state.method === 2 ? <RecapRow k="Locations recorded" v={String(state.m2.locations.length)} /> : null}
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
