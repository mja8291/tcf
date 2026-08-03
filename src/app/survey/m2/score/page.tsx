"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { TopBar } from "@/components/ui/TopBar";
import { ItemRow } from "@/components/ui/ItemRow";
import { Button } from "@/components/ui/Button";
import { BottomBar } from "@/components/ui/BottomBar";
import { useSurvey } from "@/lib/survey-context";
import { method2GroupsForLocation } from "@/lib/data/method2-items";

export default function Method2ScorePage() {
  const router = useRouter();
  const { state, m2CurrentSetScore, m2CurrentSetPhoto, m2CurrentSetNote, m2SaveCurrent } = useSurvey();
  const current = state.m2.current;

  useEffect(() => {
    if (!current) router.replace("/survey/m2");
  }, [current, router]);

  if (!current) return null;

  const groups = method2GroupsForLocation(current.type);
  const hasEntries = Object.keys(current.scores).length > 0;
  const allAnswered = groups.every((item) => Boolean(current.scores[item.name]));

  function goBack() {
    if (hasEntries && !window.confirm("Discard the scores entered for this location?")) return;
    router.push("/survey/m2");
  }

  function save() {
    if (!allAnswered) return;
    m2SaveCurrent();
    router.push("/survey/m2");
  }

  return (
    <ScreenShell>
      <TopBar title={`${current.type}${current.name ? " — " + current.name : ""}`} onBack={goBack} />

      {groups.map((item) => (
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
        <Button disabled={!allAnswered} onClick={save}>
          Save location and return
        </Button>
        {!allAnswered ? (
          <p className="text-center text-[11.5px] text-ink-faint mt-2.5">Score every item to continue.</p>
        ) : null}
      </BottomBar>
    </ScreenShell>
  );
}
