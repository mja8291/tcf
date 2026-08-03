"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { TopBar } from "@/components/ui/TopBar";
import { Gauge } from "@/components/ui/Gauge";
import { Button } from "@/components/ui/Button";
import { BottomBar } from "@/components/ui/BottomBar";
import { LocationTypeCard } from "@/components/survey/LocationTypeCard";
import { useSurvey } from "@/lib/survey-context";
import { LOCATION_TYPES, UNNAMED_LOCATION_TYPES } from "@/lib/data/method2-items";
import { scoreMethod2 } from "@/lib/scoring";

export default function Method2HubPage() {
  const router = useRouter();
  const { state, m2OpenType, m2SetName } = useSurvey();

  useEffect(() => {
    if (!state.school || state.method !== 2) router.replace("/survey/find-school");
  }, [state.school, state.method, router]);

  const result = scoreMethod2(state.m2.locations);
  const totalLocations = state.m2.locations.length;

  function openType(type: (typeof LOCATION_TYPES)[number]) {
    m2OpenType(type);
    if (UNNAMED_LOCATION_TYPES.includes(type)) {
      // Only one instance of these ever exists on a campus — skip the naming step.
      m2SetName(type);
      router.push("/survey/m2/score");
    } else {
      router.push("/survey/m2/name");
    }
  }

  if (!state.school) return null;

  return (
    <ScreenShell>
      <TopBar title="Locations" onBack={() => router.push("/survey/method")} />
      <p className="text-[12.5px] text-ink-soft leading-snug mb-3.5">
        Tap a location type to add one.
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        {LOCATION_TYPES.map((type) => (
          <LocationTypeCard
            key={type}
            type={type}
            count={state.m2.locations.filter((l) => l.type === type).length}
            onOpen={() => openType(type)}
          />
        ))}
      </div>

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
        <Button disabled={totalLocations === 0} onClick={() => router.push("/survey/review")}>
          Review and submit
        </Button>
        {totalLocations === 0 ? (
          <p className="text-center text-[11.5px] text-ink-faint mt-2.5">
            Record at least one location to continue.
          </p>
        ) : null}
      </BottomBar>
    </ScreenShell>
  );
}
