"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { TopBar } from "@/components/ui/TopBar";
import { Gauge } from "@/components/ui/Gauge";
import { Button } from "@/components/ui/Button";
import { BottomBar } from "@/components/ui/BottomBar";
import { useSurvey } from "@/lib/survey-context";
import { FLOOR_LEVELS } from "@/lib/data/method2-items";
import { scoreMethod2 } from "@/lib/scoring";
import type { FloorLevel } from "@/lib/types";

export default function Method2FloorPage() {
  const router = useRouter();
  const { state, m2SetFloor } = useSurvey();

  useEffect(() => {
    if (!state.school || state.method !== 2) router.replace("/survey/find-school");
  }, [state.school, state.method, router]);

  if (!state.school) return null;

  const result = scoreMethod2(state.m2.locations);
  const totalLocations = state.m2.locations.length;

  function chooseFloor(floor: FloorLevel) {
    if (floor === "Roof") {
      const count = state.m2.locations.filter((l) => l.type === "Roof").length;
      m2SetFloor(floor, `Roof ${count + 1}`);
      router.push("/survey/m2/category");
    } else {
      router.push(`/survey/m2/location?floor=${encodeURIComponent(floor)}`);
    }
  }

  return (
    <ScreenShell>
      <TopBar title="Floor level" onBack={() => router.push("/survey/method")} />
      <p className="text-[12.5px] text-ink-soft leading-snug mb-3.5">
        Pick the floor of the location you&apos;re about to score.
      </p>

      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {FLOOR_LEVELS.map((floor) => (
          <button
            key={floor}
            type="button"
            onClick={() => chooseFloor(floor)}
            className="rounded-2xl border border-border bg-card p-4 text-left min-h-14"
          >
            <span className="text-[14px] font-semibold text-ink">{floor}</span>
          </button>
        ))}
      </div>

      {totalLocations > 0 ? (
        <div className="mb-2">
          <div className="text-xs font-semibold text-brand-deep uppercase tracking-wide mb-2">
            Locations recorded ({totalLocations})
          </div>
          {state.m2.locations.map((loc) => (
            <div key={loc.id} className="flex items-center gap-2 py-2 border-b border-border text-[13px]">
              <Check size={14} className="text-brand shrink-0" />
              <span className="text-ink-faint">{loc.floorLevel}</span>
              <span>·</span>
              <span className="flex-1 truncate">
                {loc.type} — {loc.name}
              </span>
            </div>
          ))}
        </div>
      ) : null}

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
