import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { PROFILE, asset } from "@/lib/data";
import PageBackground from "@/components/ui/PageBackground";
import "./globals.css";

const interTight = localFont({
  src: "../fonts/InterTight-Variable.woff2",
  variable: "--font-inter-tight",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

const instrumentSerif = localFont({
  src: [
    { path: "../fonts/InstrumentSerif-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/InstrumentSerif-Italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument-serif",
  display: "swap",
  preload: false,
});

const jetbrainsMono = localFont({
  src: "../fonts/JetBrainsMono-Variable.woff2",
  variable: "--font-jetbrains-mono",
  weight: "100 800",
  style: "normal",
  display: "swap",
  preload: false,
});

const title = [PROFILE.name, PROFILE.role].filter(Boolean).join(" — ");
const description = PROFILE.resumeSummary || `${PROFILE.name} — portfolio`;

export const metadata: Metadata = {
  metadataBase: PROFILE.siteUrl ? new URL(PROFILE.siteUrl) : undefined,
  title,
  description,
  icons: { icon: asset("/favicon.svg") },
  openGraph: {
    type: "website",
    title,
    description,
    url: PROFILE.siteUrl || undefined,
    // OG images need an absolute URL — only emitted once PROFILE.siteUrl is set.
    images: PROFILE.siteUrl ? [{ url: asset("/og.jpg"), width: 1200, height: 630, alt: title }] : undefined,
  },
  twitter: {
    card: PROFILE.siteUrl ? "summary_large_image" : "summary",
    title,
    description,
    images: PROFILE.siteUrl ? [asset("/og.jpg")] : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f2ee",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <PageBackground />
        {children}
      </body>
    </html>
  );
}
