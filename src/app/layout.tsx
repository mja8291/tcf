import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { PwaBootstrap } from "@/components/PwaBootstrap";
import { SurveyProvider } from "@/lib/survey-context";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "TCF MQI Survey",
  description:
    "Maintenance Quality Index inspections for TCF school campuses — works offline, syncs when back online.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MQI Survey",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0e5c4d",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-surface text-ink">
        <PwaBootstrap />
        {/*
          Lifted here (was survey/layout.tsx-only) specifically so Home has
          access too — see AutoResumeRedirect, mounted on Home, for why:
          a PWA/TWA's start_url is always "/" (see manifest.ts), so a cold
          start (Android reclaiming the app under memory pressure while
          offline, then the surveyor reopening it — a completely ordinary
          mobile interruption, not an edge case) always lands on Home
          first, never on whichever /survey/* route they actually left off
          on. Every other auto-resume mechanism in this app (see
          ACTIVE_SURVEY_STORAGE_KEY) only helps once you're already inside
          /survey/*; this is what closes the gap for the most common real
          entry point of all. Existing consumers under /survey/* are
          unaffected — a provider higher up the tree changes nothing for
          them, context lookup just finds the nearest one either way.
        */}
        <SurveyProvider>{children}</SurveyProvider>
      </body>
    </html>
  );
}
