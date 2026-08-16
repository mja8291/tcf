"use client";

import { useEffect, useState } from "react";
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
  const { state, m2CurrentSetScore, m2CurrentAddPhoto, m2CurrentRemovePhoto, m2CurrentSetNote } = useSurvey();
  const current = state.m2.current;
  const [attemptedSave, setAttemptedSave] = useState(false);

  useEffect(() => {
    if (!current || !current.type || !current.activeWorkCategory) router.replace("/survey/m2");
  }, [current, router]);

  if (!current || !current.type || !current.activeWorkCategory) return null;

  const items = method2GroupsForLocationAndCategory(current.type, current.activeWorkCategory);
  const missing = items.filter((item) => !current.scores[item.name]);
  const allAnswered = missing.length === 0;

  function handleSave() {
    if (allAnswered) router.push("/survey/m2/category");
    else setAttemptedSave(true);
  }

  return (
    <ScreenShell>
      <TopBar title={current.activeWorkCategory} subtitle={current.name} onBack={() => router.push("/survey/m2/category")} />

      {items.map((item) => (
        <ItemRow
          key={item.name}
          item={item}
          worstCase={item.aggregation === "worst"}
          value={current.scores[item.name]}
          photos={current.photos[item.name] ?? []}
          note={current.notes[item.name]}
          onScoreChange={(v) => m2CurrentSetScore(item.name, v)}
          onAddPhoto={(f) => m2CurrentAddPhoto(item.name, f)}
          onRemovePhoto={(i) => m2CurrentRemovePhoto(item.name, i)}
          onNoteChange={(v) => m2CurrentSetNote(item.name, v)}
          pending={attemptedSave && !current.scores[item.name]}
        />
      ))}

      <BottomBar>
        <Button variant={allAnswered ? "primary" : "muted"} onClick={handleSave}>
          Save category and return
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
