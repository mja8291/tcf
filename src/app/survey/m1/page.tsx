"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { TopBar } from "@/components/ui/TopBar";
import { CategoryHeader } from "@/components/ui/CategoryHeader";
import { ItemRow } from "@/components/ui/ItemRow";
import { Gauge } from "@/components/ui/Gauge";
import { Button } from "@/components/ui/Button";
import { BottomBar } from "@/components/ui/BottomBar";
import { useSurvey } from "@/lib/survey-context";
import { METHOD1_ITEMS } from "@/lib/data/method1-items";
import { CATEGORIES, CATEGORY_WEIGHT, scoreMethod1 } from "@/lib/scoring";

export default function Method1Page() {
  const router = useRouter();
  const { state, m1SetScore, m1SetPhoto, m1SetNote } = useSurvey();

  useEffect(() => {
    if (!state.school || state.method !== 1) router.replace("/survey/find-school");
  }, [state.school, state.method, router]);

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof METHOD1_ITEMS>();
    for (const cat of CATEGORIES) map.set(cat, METHOD1_ITEMS.filter((i) => i.category === cat));
    return map;
  }, []);

  const answered = Object.keys(state.m1.scores).filter((k) => state.m1.scores[k]).length;
  const allAnswered = answered === METHOD1_ITEMS.length;
  const result = scoreMethod1(state.m1.scores);

  if (!state.school) return null;

  return (
    <ScreenShell>
      <TopBar
        title="Campus scoring"
        onBack={() => router.push("/survey/method")}
        right={
          <span className="text-xs text-ink-soft bg-surface px-2.5 py-1.5 rounded-lg">
            {answered} of {METHOD1_ITEMS.length} scored
          </span>
        }
      />

      {CATEGORIES.map((cat) => (
        <div key={cat}>
          <CategoryHeader category={cat} weight={CATEGORY_WEIGHT[cat]} />
          {byCategory.get(cat)!.map((item) => (
            <ItemRow
              key={item.name}
              item={item}
              value={state.m1.scores[item.name]}
              photo={state.m1.photos[item.name]}
              note={state.m1.notes[item.name]}
              onScoreChange={(v) => m1SetScore(item.name, v)}
              onPhotoChange={(f) => m1SetPhoto(item.name, f)}
              onNoteChange={(v) => m1SetNote(item.name, v)}
            />
          ))}
        </div>
      ))}

      <BottomBar>
        <div className="flex items-center gap-3.5 mb-2.5">
          <Gauge score={result.overall} />
          <div>
            <div className="text-xs text-ink-soft">Overall (live)</div>
            <div className="font-display text-xl font-semibold text-brand-deep">
              {result.overall === null ? "0%" : `${Math.round(result.overall)}%`}
            </div>
          </div>
        </div>
        <Button disabled={!allAnswered} onClick={() => router.push("/survey/review")}>
          Review and submit
        </Button>
        {!allAnswered ? (
          <p className="text-center text-[11.5px] text-ink-faint mt-2.5">Score every item to continue.</p>
        ) : null}
      </BottomBar>
    </ScreenShell>
  );
}
