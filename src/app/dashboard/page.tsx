"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { TopBar } from "@/components/ui/TopBar";
import { StatCard } from "@/components/dashboard/StatCard";
import { ScoreDistribution } from "@/components/dashboard/ScoreDistribution";
import { RegionRow } from "@/components/dashboard/RegionRow";
import { SchoolRow } from "@/components/dashboard/SchoolRow";
import { BAND_COLOR, bandColor } from "@/lib/scoring";
import type { RatingBand } from "@/lib/types";
import type { DashboardData } from "@/lib/sheets/dashboard";

const FILTERS: ("All" | RatingBand)[] = ["All", "Excellent", "Good", "Average", "Poor"];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [filter, setFilter] = useState<"All" | RatingBand>("All");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const filteredSchools = data ? data.schools.filter((s) => filter === "All" || s.band === filter) : [];

  return (
    <ScreenShell>
      <TopBar
        title="MQI Dashboard"
        onBack={() => router.push("/")}
        right={
          <a href="/api/export/all" className="text-xs font-semibold text-brand-deep underline">
            Export all (.xlsx)
          </a>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-0.5 mb-3.5 -mx-5 px-5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full border ${
              filter === f ? "bg-brand border-brand text-white" : "bg-white border-border text-ink-soft"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {!data ? (
        <p className="text-sm text-ink-faint">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <StatCard label="Total schools in scope" value={String(data.totalSchools)} />
            <StatCard label="Captured" value={String(data.captured)} sub={`${data.pending} pending`} />
            <StatCard
              label="Average score"
              value={data.averageScore === null ? "—" : `${Math.round(data.averageScore)}%`}
              color={bandColor(data.averageScore)}
            />
            <StatCard
              label="Overall rating"
              value={data.overallBand ?? "—"}
              color={data.overallBand ? BAND_COLOR[data.overallBand] : undefined}
            />
          </div>

          <div className="text-xs font-semibold text-brand-deep uppercase tracking-wide mt-4 mb-2.5">
            Score distribution
          </div>
          <ScoreDistribution distribution={data.distribution} />

          <div className="text-xs font-semibold text-brand-deep uppercase tracking-wide mt-5 mb-2.5">By region</div>
          {data.byRegion.length === 0 ? (
            <p className="text-xs text-ink-faint">No regions captured yet.</p>
          ) : (
            data.byRegion.map((r) => <RegionRow key={r.region} {...r} />)
          )}

          <div className="text-xs font-semibold text-brand-deep uppercase tracking-wide mt-5 mb-1">
            Schools captured
          </div>
          {filteredSchools.length === 0 ? (
            <p className="text-xs text-ink-faint py-3">No schools match this filter.</p>
          ) : (
            filteredSchools.map((s) => <SchoolRow key={s.schoolId} school={s} />)
          )}
        </>
      )}
    </ScreenShell>
  );
}
