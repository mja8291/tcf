"use client";

import { Suspense, useEffect, useState } from "react";
import { Check, CloudOff, Download, FileText } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { useSurvey } from "@/lib/survey-context";
import { flushPendingSubmissions } from "@/lib/offline/sync";

function DoneContent() {
  const { state, reset } = useSurvey();
  const queued = useSearchParams().get("queued") === "1";
  // Captured once on mount — reset() (below) clears state.lastSurveyId on the
  // very next render, so reading state directly here would make the download
  // buttons flash and disappear.
  const [surveyId] = useState(state.lastSurveyId);

  // Clear survey state once the submission has actually landed here, rather
  // than before navigating away from Review — resetting first raced with the
  // navigation and sent the app back to find-school.
  useEffect(() => {
    reset();
    if (queued) flushPendingSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScreenShell>
      <div className="flex-[0.3]" />
      <div className="h-16 w-16 rounded-full bg-brand-tint text-brand flex items-center justify-center mx-auto mb-5">
        {queued ? <CloudOff size={28} /> : <Check size={30} />}
      </div>
      <h1 className="text-[26px] text-center text-brand-deep mb-1.5">
        {queued ? "Saved offline" : "Survey submitted"}
      </h1>
      <p className="text-sm text-ink-soft text-center leading-relaxed mb-7">
        {queued
          ? "No connection right now — this survey is saved on your device and will sync automatically the next time you're online."
          : "Thanks — the results have been written to the MQI record for this campus."}
      </p>

      {!queued && surveyId ? (
        <>
          <a
            href={`/api/export/survey/${surveyId}`}
            className="w-full min-h-11 rounded-xl px-5 py-3 text-sm font-semibold text-center bg-brand text-white flex items-center justify-center gap-2 mb-2.5"
          >
            <Download size={16} /> Download Excel copy
          </a>
          <a
            href={`/api/export/survey/${surveyId}/pdf`}
            className="w-full min-h-11 rounded-xl px-5 py-3 text-sm font-semibold text-center bg-brand text-white flex items-center justify-center gap-2 mb-2.5"
          >
            <FileText size={16} /> Download PDF copy
          </a>
        </>
      ) : queued ? (
        <p className="text-[11.5px] text-ink-faint text-center mb-2.5">
          Excel/PDF copies will be available once this survey syncs.
        </p>
      ) : null}

      <Link
        href="/"
        className="w-full min-h-11 rounded-xl px-5 py-3 text-sm font-semibold text-center bg-transparent text-brand-deep border border-border"
      >
        Go to Home
      </Link>
      <div className="flex-1" />
    </ScreenShell>
  );
}

export default function DonePage() {
  return (
    <Suspense fallback={null}>
      <DoneContent />
    </Suspense>
  );
}
