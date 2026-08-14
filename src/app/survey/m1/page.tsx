"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { TopBar } from "@/components/ui/TopBar";
import { Gauge } from "@/components/ui/Gauge";
import { Button } from "@/components/ui/Button";
import { BottomBar } from "@/components/ui/BottomBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CategoryCard } from "@/components/survey/CategoryCard";
import { useSurvey } from "@/lib/survey-context";
import { METHOD1_ITEMS } from "@/lib/data/method1-items";
import { CATEGORIES, CATEGORY_WEIGHT, scoreMethod1 } from "@/lib/scoring";

export default function Method1CategoriesPage() {
  const router = useRouter();
  const { state, discardMethodProgress } = useSurvey();
  const [confirmBack, setConfirmBack] = useState(false);

  useEffect(() => {
    if (!state.school || state.method !== 1) router.replace("/survey/find-school");
  }, [state.school, state.method, router]);

  if (!state.school) return null;

  const answeredTotal = Object.keys(state.m1.scores).filter((k) => state.m1.scores[k]).length;
  const allAnswered = answeredTotal === METHOD1_ITEMS.length;
  const result = scoreMethod1(state.m1.scores);

  function confirmDiscardAndGoBack() {
    discardMethodProgress();
    router.push("/survey/method");
  }

  return (
    <ScreenShell>
      <TopBar title="Campus scoring" onBack={() => setConfirmBack(true)} />
      <ConfirmDialog
        open={confirmBack}
        title="Discard this assessment?"
        message="Going back will discard your progress and reset the timer. Continue?"
        onConfirm={confirmDiscardAndGoBack}
        onCancel={() => setConfirmBack(false)}
      />

      {CATEGORIES.map((cat) => {
        const items = METHOD1_ITEMS.filter((i) => i.category === cat);
        const answered = items.filter((i) => state.m1.scores[i.name]).length;
        return (
          <CategoryCard
            key={cat}
            category={cat}
            weight={CATEGORY_WEIGHT[cat]}
            answered={answered}
            total={items.length}
            onOpen={() => router.push(`/survey/m1/${cat}`)}
          />
        );
      })}

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
          <p className="text-center text-[11.5px] text-ink-faint mt-2.5">
            Score every item in all three categories to continue.
          </p>
        ) : null}
      </BottomBar>
    </ScreenShell>
  );
}
