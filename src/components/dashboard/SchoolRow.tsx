import { Download } from "lucide-react";
import { BAND_COLOR } from "@/lib/scoring";
import type { CapturedSchool } from "@/lib/data/mock-dashboard";

const BAND_TINT: Record<string, string> = {
  Excellent: "var(--brand-tint)",
  Good: "var(--brand-tint)",
  Average: "var(--band-average-tint)",
  Poor: "var(--band-poor-tint)",
};

export function SchoolRow({ school }: { school: CapturedSchool }) {
  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b border-border">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold truncate">{school.name}</div>
        <div className="text-[11px] text-ink-faint">
          {school.region} · {school.area} · Method {school.method} ·{" "}
          {school.date ? new Date(school.date).toLocaleDateString() : "—"}
        </div>
      </div>
      <span
        className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full shrink-0"
        style={{ background: BAND_TINT[school.band], color: BAND_COLOR[school.band] }}
      >
        {Math.round(school.overall)}% · {school.band}
      </span>
      {school.surveyId ? (
        <a
          href={`/api/export/survey/${school.surveyId}`}
          aria-label={`Export ${school.name} as Excel`}
          className="h-10 w-10 shrink-0 rounded-lg border border-border flex items-center justify-center text-ink-faint"
        >
          <Download size={15} />
        </a>
      ) : null}
    </div>
  );
}
