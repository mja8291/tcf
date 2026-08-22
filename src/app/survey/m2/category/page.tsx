"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { TopBar } from "@/components/ui/TopBar";
import { AccordionSection } from "@/components/ui/AccordionSection";
import { ItemRow } from "@/components/ui/ItemRow";
import { Button } from "@/components/ui/Button";
import { BottomBar } from "@/components/ui/BottomBar";
import { useSurvey } from "@/lib/survey-context";
import { usePhotoUploadHandlers } from "@/lib/use-photo-upload-handlers";
import {
  WORK_CATEGORIES,
  method2GroupsForLocationAndCategory,
  workCategoryCountsForLocation,
} from "@/lib/data/method2-items";
import type { WorkCategory } from "@/lib/types";

/**
 * Method 2's work-category picker and per-category item-scoring page,
 * merged into one accordion (Round 3 Task 11) — the old m2/score route is
 * gone; this is now the only screen for scoring a location. Sections
 * collapsed by default, one open at a time.
 *
 * Satisfies Task 13 together with this: m2/page.tsx's "Locations recorded"
 * list already links a finalized location back here via m2ResumeLocation
 * (unchanged) — that now lands on this single accordion with everything
 * pre-filled and editable, instead of a separate work-category picker, so
 * editing an earlier location's category is just tapping its header.
 */
export default function Method2CategoryPage() {
  const router = useRouter();
  const {
    state,
    m2CurrentSetScore,
    m2CurrentAddPhoto,
    m2CurrentSetPhotoStatus,
    m2CurrentRemovePhoto,
    m2CurrentSetNote,
    m2FinalizeCurrent,
  } = useSurvey();
  const current = state.m2.current;
  const { handleAddPhoto, handleRetryPhoto, handleRemovePhoto } = usePhotoUploadHandlers({
    surveyId: state.surveyId,
    region: state.school?.region ?? "",
    campusName: state.school?.name ?? "",
    floorLevel: current?.floorLevel,
    locationType: current?.type ?? undefined,
    locationName: current?.name,
    addPhoto: m2CurrentAddPhoto,
    setPhotoStatus: m2CurrentSetPhotoStatus,
    removePhoto: m2CurrentRemovePhoto,
  });
  const [openCategory, setOpenCategory] = useState<WorkCategory | null>(null);
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
    return { wc, items, answered, total: items.length, complete: answered === items.length };
  });
  const incomplete = categoryStatus.filter((c) => !c.complete);
  const allComplete = incomplete.length === 0;

  function targetRoute() {
    const floorLevel = current!.floorLevel;
    return floorLevel === "Roof" ? "/survey/m2" : `/survey/m2/location?floor=${encodeURIComponent(floorLevel)}`;
  }

  // Unrestricted — always saves whatever's been scored so far and leaves.
  // Deliberately not gated on completeness (see BottomBar's "Save Selection
  // and Return" below for the validated equivalent).
  function goBack() {
    m2FinalizeCurrent();
    router.push(targetRoute());
  }

  function saveSelectionAndReturn() {
    if (allComplete) {
      m2FinalizeCurrent();
      router.push(targetRoute());
      return;
    }
    // Incomplete: stay put, mark every unscored item pending, and jump to
    // the first work category that still has one, same reasoning as
    // Method 1's equivalent — a pending marker inside a collapsed section
    // is invisible otherwise.
    setAttemptedSave(true);
    const firstIncomplete = categoryStatus.find((c) => !c.complete);
    if (firstIncomplete) setOpenCategory(firstIncomplete.wc);
  }

  return (
    <ScreenShell>
      <TopBar title="Work category" onBack={goBack} />
      <div className="bg-brand-tint text-brand-deep text-[13px] font-semibold rounded-xl px-3.5 py-2.5 mb-4">
        {current.floorLevel} — {type} — {current.name}
      </div>

      {categoryStatus.map(({ wc, items, answered, total }) => (
        <AccordionSection
          key={wc}
          title={wc}
          answered={answered}
          total={total}
          open={openCategory === wc}
          onToggle={() => setOpenCategory((prev) => (prev === wc ? null : wc))}
          pending={attemptedSave && answered < total}
        >
          {items.map((item) => (
            <ItemRow
              key={item.name}
              item={item}
              worstCase={item.aggregation === "worst"}
              value={current!.scores[item.name]}
              photos={current!.photos[item.name] ?? []}
              note={current!.notes[item.name]}
              onScoreChange={(v) => m2CurrentSetScore(item.name, v)}
              onAddPhoto={(f) => handleAddPhoto(item.name, f)}
              onRemovePhoto={(id) => handleRemovePhoto(item.name, id)}
              onRetryPhoto={(id, f) => handleRetryPhoto(item.name, id, f)}
              onNoteChange={(v) => m2CurrentSetNote(item.name, v)}
              pending={attemptedSave && !current!.scores[item.name]}
            />
          ))}
        </AccordionSection>
      ))}

      <BottomBar>
        <Button variant={allComplete ? "primary" : "muted"} onClick={saveSelectionAndReturn}>
          Save Selection and Return
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
