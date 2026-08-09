"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { TopBar } from "@/components/ui/TopBar";
import { ItemRow } from "@/components/ui/ItemRow";
import { Button } from "@/components/ui/Button";
import { BottomBar } from "@/components/ui/BottomBar";
import { useSurvey } from "@/lib/survey-context";
import { method2GroupsForLocationAndCategory } from "@/lib/data/method2-items";

export default function Method2ScorePage() {
  const router = useRouter();
  const { state, m2CurrentSetScore, m2CurrentSetPhoto, m2CurrentSetNote } = useSurvey();
  const current = state.m2.current;

  useEffect(() => {
    if (!current || !current.type || !current.activeWorkCategory) router.replace("/survey/m2");
  }, [current, router]);

  if (!current || !current.type || !current.activeWorkCategory) return null;

  const items = method2GroupsForLocationAndCategory(current.type, current.activeWorkCategory);
  const allAnswered = items.every((item) => Boolean(current.scores[item.name]));

  return (
    <ScreenShell>
      <TopBar title={current.activeWorkCategory} subtitle={current.name} onBack={() => router.push("/survey/m2/category")} />

      {items.map((item) => (
        <ItemRow
          key={item.name}
          item={item}
          worstCase={item.aggregation === "worst"}
          value={current.scores[item.name]}
          photo={current.photos[item.name]}
          note={current.notes[item.name]}
          onScoreChange={(v) => m2CurrentSetScore(item.name, v)}
          onPhotoChange={(f) => m2CurrentSetPhoto(item.name, f)}
          onNoteChange={(v) => m2CurrentSetNote(item.name, v)}
        />
      ))}

      <BottomBar>
        <Button disabled={!allAnswered} onClick={() => router.push("/survey/m2/category")}>
          Save category and return
        </Button>
        {!allAnswered ? (
          <p className="text-center text-[11.5px] text-ink-faint mt-2.5">Score every item to continue.</p>
        ) : null}
      </BottomBar>
    </ScreenShell>
  );
}
