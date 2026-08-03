"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";
import Link from "next/link";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { useSurvey } from "@/lib/survey-context";

export default function DonePage() {
  const { reset } = useSurvey();

  // Clear survey state once the submission has actually landed here, rather
  // than before navigating away from Review — resetting first raced with the
  // navigation and sent the app back to find-school.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScreenShell>
      <div className="flex-[0.4]" />
      <div className="h-16 w-16 rounded-full bg-brand-tint text-brand flex items-center justify-center mx-auto mb-5">
        <Check size={30} />
      </div>
      <h1 className="text-[26px] text-center text-brand-deep mb-1.5">Survey submitted</h1>
      <p className="text-sm text-ink-soft text-center leading-relaxed mb-7">
        Thanks — the results have been written to the MQI record for this campus.
      </p>
      <Link
        href="/survey/find-school"
        className="w-full min-h-11 rounded-xl px-5 py-3 text-sm font-semibold text-center bg-transparent text-brand-deep border border-border"
      >
        Start another survey
      </Link>
      <div className="flex-1" />
    </ScreenShell>
  );
}
