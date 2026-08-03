"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { TopBar } from "@/components/ui/TopBar";
import { Field, TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { BottomBar } from "@/components/ui/BottomBar";
import { useSurvey } from "@/lib/survey-context";
import { LOCATION_NAME_OPTIONS } from "@/lib/data/method2-items";

export default function Method2NamePage() {
  const router = useRouter();
  const { state, m2SetName } = useSurvey();
  const [name, setName] = useState("");

  useEffect(() => {
    if (!state.m2.current) router.replace("/survey/m2");
  }, [state.m2.current, router]);

  if (!state.m2.current) return null;

  const options = LOCATION_NAME_OPTIONS[state.m2.current.type];

  function start() {
    m2SetName(name);
    router.push("/survey/m2/score");
  }

  return (
    <ScreenShell>
      <TopBar title={state.m2.current.type} onBack={() => router.push("/survey/m2")} />
      <Field label="Location">
        {options ? (
          <select
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-[10px] border border-border bg-white px-3 py-3 text-base text-ink"
          >
            <option value="">Select which one</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : (
          <TextInput
            placeholder="e.g. Classroom 3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        )}
      </Field>
      <BottomBar>
        <Button onClick={start} disabled={options ? !name : false}>
          Start scoring
        </Button>
      </BottomBar>
    </ScreenShell>
  );
}
