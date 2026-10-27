import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { PwaBootstrap } from "@/components/PwaBootstrap";
import { SurveyProvider } from "@/lib/survey-context";
import { AuthGate, AuthProvider } from "@/lib/auth/client";

// Self-hosted (the latin subset of Space Grotesk, one variable file) rather than
// next/font/google: that fetches from Google at build time, and Vercel's build
// failed resolving it ("next/font/google queries have exactly one entry") even
// though nothing in this project had changed. A local file also means the build
// needs no network and the font is always in the offline precache.
const spaceGrotesk = localFont({
  variable: "--font-space-grotesk",
  src: "./fonts/SpaceGrotesk-latin.woff2",
  weight: "500 600",
  display: "swap",
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
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
        {/*
          SurveyProvider sits *outside* AuthGate on purpose: when a session
          lapses mid-survey the gate swaps the screen for the sign-in page,
          and the survey in memory (and its autosave) must survive that, not
          unmount with the page.
        */}
        <AuthProvider>
          <SurveyProvider>
            <AuthGate>{children}</AuthGate>
          </SurveyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
