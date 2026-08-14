"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { TopBar } from "@/components/ui/TopBar";
import { Button } from "@/components/ui/Button";
import { BottomBar } from "@/components/ui/BottomBar";
import { useSurvey } from "@/lib/survey-context";
import { WORK_CATEGORIES, method2GroupsForLocationAndCategory, workCategoryCountsForLocation } from "@/lib/data/method2-items";

export default function Method2CategoryPage() {
  const router = useRouter();
  const { state, m2OpenCategory, m2FinalizeCurrent } = useSurvey();
  const current = state.m2.current;
  const [attemptedSave, setAttemptedSave] = useState(false);

  // Mount-only: goBack() below deliberately clears `current` as part of
  // navigating away — if this depended on `current` it would re-fire on
  // that transition and race the explicit router.push.
  useEffect(() => {
    if (!current || !current.type) router.replace("/survey/m2");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!current || !current.type) return null;
  const type = current.type;

  const counts = workCategoryCountsForLocation(type);
  const applicableCategories = WORK_CATEGORIES.filter((wc) => counts[wc] > 0);
  const categoryStatus = applicableCategories.map((wc) => {
    const items = method2GroupsForLocationAndCategory(type, wc);
    const answered = items.filter((i) => current!.scores[i.name]).length;
    return { wc, answered, total: items.length, complete: answered === items.length };
  });
  const incomplete = categoryStatus.filter((c) => !c.complete);
  const allComplete = incomplete.length === 0;

  function targetRoute() {
    const floorLevel = current!.floorLevel;
    return floorLevel === "Roof" ? "/survey/m2" : `/survey/m2/location?floor=${encodeURIComponent(floorLevel)}`;
  }

  // Unrestricted — always saves whatever's been scored so far and leaves.
  // Deliberately not gated on completeness (see BottomBar's "Save location
  // and return" below for the validated equivalent).
  function goBack() {
    m2FinalizeCurrent();
    router.push(targetRoute());
  }

  function saveLocationAndReturn() {
    if (allComplete) {
      m2FinalizeCurrent();
      router.push(targetRoute());
    } else {
      setAttemptedSave(true);
    }
  }

  function openCategory(workCategory: (typeof WORK_CATEGORIES)[number]) {
    m2OpenCategory(workCategory);
    router.push("/survey/m2/score");
  }

  return (
    <ScreenShell>
      <TopBar title="Work category" onBack={goBack} />
      <div className="bg-brand-tint text-brand-deep text-[13px] font-semibold rounded-xl px-3.5 py-2.5 mb-4">
        {current.floorLevel} — {type} — {current.name}
      </div>

      {categoryStatus.map(({ wc, answered, total, complete }) => (
        <button
          key={wc}
          type="button"
          onClick={() => openCategory(wc)}
          className="w-full text-left rounded-2xl border border-border bg-card p-4 mb-3 flex items-center gap-3.5"
        >
          <div className="h-11 w-11 rounded-xl bg-brand-tint flex items-center justify-center shrink-0">
            {complete ? <Check size={20} className="text-brand-deep" /> : null}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-ink">
              {wc}
              {attemptedSave && !complete ? (
                <span
                  className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-band-poor-tint align-middle text-[10.5px] font-bold text-band-poor"
                  aria-label="Still has unscored items"
                >
                  *
                </span>
              ) : null}
            </div>
            <div className="text-[12px] text-ink-faint">
              {answered} of {total} scored
            </div>
          </div>
        </button>
      ))}

      <BottomBar>
        <Button variant={allComplete ? "primary" : "muted"} onClick={saveLocationAndReturn}>
          Save location and return
        </Button>
        {attemptedSave && !allComplete ? (
          <p className="text-center text-[11.5px] text-band-poor mt-2.5">
            {incomplete.length === 1
              ? `"${incomplete[0].wc}" still has unscored items.`
              : `${incomplete.length} categories still have unscored items.`}
          </p>
        ) : (
          <p className="text-center text-[11.5px] text-ink-faint mt-2.5">
            Score every category, or use the back arrow to save progress and come back later.
          </p>
        )}
      </BottomBar>
    </ScreenShell>
  );
}
