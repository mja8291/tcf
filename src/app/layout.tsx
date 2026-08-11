import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { PwaBootstrap } from "@/components/PwaBootstrap";

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
        {children}
      </body>
    </html>
  );
}
