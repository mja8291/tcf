"use client";

import { use, useEffect } from "react";
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

  useEffect(() => {
    if (!state.school || state.method !== 1) router.replace("/survey/find-school");
    else if (!category) router.replace("/survey/m1");
  }, [state.school, state.method, category, router]);

  if (!state.school || !category) return null;

  const items = METHOD1_ITEMS.filter((i) => i.category === category);

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
        />
      ))}

      <BottomBar>
        <Button onClick={() => router.push("/survey/m1")}>Save and return to categories</Button>
      </BottomBar>
    </ScreenShell>
  );
}
