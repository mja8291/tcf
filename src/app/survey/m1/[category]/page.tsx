"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { TopBar } from "@/components/ui/TopBar";
import { ItemRow } from "@/components/ui/ItemRow";
import { Button } from "@/components/ui/Button";
import { BottomBar } from "@/components/ui/BottomBar";
import { useSurvey } from "@/lib/survey-context";
import { METHOD1_ITEMS } from "@/lib/data/method1-items";
import { CATEGORIES } from "@/lib/scoring";
import type { Category } from "@/lib/types";

export default function Method1CategoryScorePage({ params }: { params: Promise<{ category: string }> }) {
  const router = useRouter();
  const { state, m1SetScore, m1SetPhoto, m1SetNote } = useSurvey();
  const { category: categoryParam } = use(params);
  const category = CATEGORIES.includes(categoryParam as Category) ? (categoryParam as Category) : null;
  const [attemptedSave, setAttemptedSave] = useState(false);

  useEffect(() => {
    if (!state.school || state.method !== 1) router.replace("/survey/find-school");
    else if (!category) router.replace("/survey/m1");
  }, [state.school, state.method, category, router]);

  if (!state.school || !category) return null;

  const items = METHOD1_ITEMS.filter((i) => i.category === category);
  const missing = items.filter((i) => !state.m1.scores[i.name]);
  const allAnswered = missing.length === 0;

  function handleSave() {
    if (allAnswered) router.push("/survey/m1");
    // Incomplete: stay put and mark every unscored item with a red asterisk
    // instead of silently doing nothing — the button itself is never
    // HTML-disabled so this click always registers.
    else setAttemptedSave(true);
  }

  return (
    <ScreenShell>
      <TopBar title={category} onBack={() => router.push("/survey/m1")} />

      {items.map((item) => (
        <ItemRow
          key={item.name}
          item={item}
          value={state.m1.scores[item.name]}
          photo={state.m1.photos[item.name]}
          note={state.m1.notes[item.name]}
          onScoreChange={(v) => m1SetScore(item.name, v)}
          onPhotoChange={(f) => m1SetPhoto(item.name, f)}
          onNoteChange={(v) => m1SetNote(item.name, v)}
          pending={attemptedSave && !state.m1.scores[item.name]}
        />
      ))}

      <BottomBar>
        <Button variant={allAnswered ? "primary" : "muted"} onClick={handleSave}>
          Save and return to categories
        </Button>
        {attemptedSave && !allAnswered ? (
          <p className="text-center text-[11.5px] text-band-poor mt-2.5">
            {missing.length === 1 ? "1 item still needs a response." : `${missing.length} items still need a response.`}
          </p>
        ) : null}
      </BottomBar>
    </ScreenShell>
  );
}
