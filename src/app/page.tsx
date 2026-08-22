import Link from "next/link";
import Image from "next/image";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { PendingSyncBanner } from "@/components/PendingSyncBanner";
import { DraftsBanner } from "@/components/DraftsBanner";

export default function HomePage() {
  return (
    <ScreenShell>
      <div className="flex-[0.4]" />
      <PendingSyncBanner />
      <DraftsBanner />
      <div className="h-16 w-16 rounded-2xl bg-white border border-border flex items-center justify-center p-2 mb-5">
        <Image
          src="/tcf-logo.png"
          alt="The Citizens Foundation logo"
          width={48}
          height={48}
          style={{ objectFit: "contain" }}
          priority
        />
      </div>
      <h1 className="text-[26px] mb-1.5 text-brand-deep">MQI survey</h1>
      <p className="text-sm text-ink-soft leading-relaxed mb-7">
        TCF Repair &amp; Maintenance Programme — score a campus against the Maintenance Quality Index, on site, in
        one session.
      </p>
      <Link
        href="/survey/find-school"
        className="w-full min-h-11 rounded-xl px-5 py-3 text-sm font-semibold text-center bg-brand text-white"
      >
        Start new survey
      </Link>
      <Link
        href="/dashboard"
        className="w-full min-h-11 rounded-xl px-5 py-3 text-sm font-semibold text-center bg-transparent text-brand-deep border border-border mt-2.5"
      >
        View dashboard
      </Link>
      <div className="flex-1" />
    </ScreenShell>
  );
}
