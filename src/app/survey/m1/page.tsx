"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { TopBar } from "@/components/ui/TopBar";
import { Gauge } from "@/components/ui/Gauge";
import { Button } from "@/components/ui/Button";
import { BottomBar } from "@/components/ui/BottomBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AccordionSection } from "@/components/ui/AccordionSection";
import { ItemRow } from "@/components/ui/ItemRow";
import { useSurvey } from "@/lib/survey-context";
import { usePhotoUploadHandlers } from "@/lib/use-photo-upload-handlers";
import { METHOD1_ITEMS } from "@/lib/data/method1-items";
import { CATEGORIES, CATEGORY_WEIGHT, scoreMethod1 } from "@/lib/scoring";
import type { Category } from "@/lib/types";

const TINT: Record<Category, string> = {
  Functionality: "var(--cat-functionality-tint)",
  Safety: "var(--cat-safety-tint)",
  Aesthetics: "var(--cat-aesthetics-tint)",
};

/**
 * Method 1's category picker and per-category item-scoring page, merged
 * into one accordion (Round 3 Task 11) — the old m1/[category] route is
 * gone; this is now the only screen between Campus Visit and Review.
 * Sections are collapsed by default, one open at a time.
 *
 * This also satisfies Task 13: there's no longer a separate "already-scored
 * category" list to build a click-to-edit affordance for — editing an
 * earlier category is just tapping its (still-collapsed) header to
 * re-expand it. The scores underneath are already live from context, so
 * there's nothing extra to wire up for "edit mode".
 */
export default function Method1Page() {
  const router = useRouter();
  const { state, m1SetScore, m1AddPhoto, m1SetPhotoStatus, m1RemovePhoto, m1SetNote, discardMethodProgress } =
    useSurvey();
  const { handleAddPhoto, handleRetryPhoto, handleRemovePhoto } = usePhotoUploadHandlers({
    surveyId: state.surveyId,
    region: state.school?.region ?? "",
    campusName: state.school?.name ?? "",
    addPhoto: m1AddPhoto,
    setPhotoStatus: m1SetPhotoStatus,
    removePhoto: m1RemovePhoto,
  });
  const [confirmBack, setConfirmBack] = useState(false);
  const [openCategory, setOpenCategory] = useState<Category | null>(null);
  const [attemptedSave, setAttemptedSave] = useState(false);

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

  function handleReviewAndSubmit() {
    if (allAnswered) {
      router.push("/survey/review");
      return;
    }
    // Incomplete: stay put, mark every unscored item pending, and jump to
    // the first category that has one — the button is deliberately never
    // HTML-disabled so this click always registers, but the markers it sets
    // are useless sitting inside a collapsed section, so open it.
    setAttemptedSave(true);
    const firstIncomplete = CATEGORIES.find((cat) =>
      METHOD1_ITEMS.some((i) => i.category === cat && !state.m1.scores[i.name])
    );
    if (firstIncomplete) setOpenCategory(firstIncomplete);
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
          <AccordionSection
            key={cat}
            title={cat}
            subtitle={`${CATEGORY_WEIGHT[cat]}% of overall`}
            answered={answered}
            total={items.length}
            open={openCategory === cat}
            onToggle={() => setOpenCategory((prev) => (prev === cat ? null : cat))}
            pending={attemptedSave && answered < items.length}
            tint={TINT[cat]}
          >
            {items.map((item) => (
              <ItemRow
                key={item.name}
                item={item}
                value={state.m1.scores[item.name]}
                photos={state.m1.photos[item.name] ?? []}
                note={state.m1.notes[item.name]}
                onScoreChange={(v) => m1SetScore(item.name, v)}
                onAddPhoto={(f) => handleAddPhoto(item.name, f)}
                onRemovePhoto={(id) => handleRemovePhoto(item.name, id)}
                onRetryPhoto={(id, f) => handleRetryPhoto(item.name, id, f)}
                onNoteChange={(v) => m1SetNote(item.name, v)}
                pending={attemptedSave && !state.m1.scores[item.name]}
              />
            ))}
          </AccordionSection>
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
        <Button variant={allAnswered ? "primary" : "muted"} onClick={handleReviewAndSubmit}>
          Review and submit
        </Button>
        {attemptedSave && !allAnswered ? (
          <p className="text-center text-[11.5px] text-band-poor mt-2.5">
            Score every item in all three categories to continue.
          </p>
        ) : !allAnswered ? (
          <p className="text-center text-[11.5px] text-ink-faint mt-2.5">
            Score every item in all three categories to continue.
          </p>
        ) : null}
      </BottomBar>
    </ScreenShell>
  );
}
