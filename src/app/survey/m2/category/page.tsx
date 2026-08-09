"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { TopBar } from "@/components/ui/TopBar";
import { useSurvey } from "@/lib/survey-context";
import { WORK_CATEGORIES, method2GroupsForLocationAndCategory, workCategoryCountsForLocation } from "@/lib/data/method2-items";

export default function Method2CategoryPage() {
  const router = useRouter();
  const { state, m2OpenCategory, m2FinalizeCurrent } = useSurvey();
  const current = state.m2.current;

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

  function goBack() {
    const floorLevel = current!.floorLevel;
    m2FinalizeCurrent();
    router.push(
      floorLevel === "Roof" ? "/survey/m2" : `/survey/m2/location?floor=${encodeURIComponent(floorLevel)}`
    );
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

      {WORK_CATEGORIES.filter((wc) => counts[wc] > 0).map((wc) => {
        const items = method2GroupsForLocationAndCategory(type, wc);
        const answered = items.filter((i) => current!.scores[i.name]).length;
        const complete = answered === items.length;
        return (
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
              <div className="text-[15px] font-semibold text-ink">{wc}</div>
              <div className="text-[12px] text-ink-faint">
                {answered} of {items.length} scored
              </div>
            </div>
          </button>
        );
      })}

      <p className="text-[11.5px] text-ink-faint text-center mt-2">
        Score every category, then use the back arrow to move to the next location.
      </p>
    </ScreenShell>
  );
}
