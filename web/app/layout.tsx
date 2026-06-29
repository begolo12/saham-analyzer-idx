import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Toaster } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { LinkPrefetch } from "@/components/link-prefetch";
import { NetworkStatusIndicator } from "@/components/network-status-indicator";
import { InstallPrompt } from "@/components/install-prompt";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Lazy-load heavy interactive components — they're not needed for initial paint
const CommandPalette = dynamic(
  () => import("@/components/command-palette").then((m) => ({ default: m.CommandPalette })),
  { ssr: false },
);

export const metadata: Metadata = {
  title: "Saham Analyzer IDX - Analisa Saham Indonesia",
  description:
    "Analisa saham IDX lengkap dengan rekomendasi Buy/Hold/Sell berbasis teknikal, fundamental, behavioral, dan sentimen berita.",
  keywords: ["saham", "IDX", "analisa", "BBCA", "TLKM", "ASII", "indonesia"],
  authors: [{ name: "Saham Analyzer" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SahamIDX",
  },
  openGraph: {
    title: "Saham Analyzer IDX",
    description: "Analisa saham Indonesia dengan AI",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6c63ff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1530" },
  ],
};

/**
 * Inline script to prevent FOUC (flash of unstyled content).
 * Runs before React hydrates — reads localStorage and applies dark class immediately.
 */
function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  try {
    var t = localStorage.getItem('saham-theme');
    var dark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch(e) {}
})();
        `,
      }}
    />
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <ThemeScript />
        {/* Preconnect hints for Yahoo Finance API — speed up data fetches */}
        <link rel="preconnect" href="https://query1.finance.yahoo.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://query2.finance.yahoo.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://query1.finance.yahoo.com" />
        <link rel="dns-prefetch" href="https://query2.finance.yahoo.com" />
        {/* Preconnect for Clearbit logos */}
        <link rel="preconnect" href="https://logo.clearbit.com" />
        <link rel="dns-prefetch" href="https://logo.clearbit.com" />
      </head>
      <body className="app-shell min-h-screen bg-background">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors />
          <BottomNav />
          <KeyboardShortcuts />
          <ServiceWorkerRegister />
          <CommandPalette />
          <LinkPrefetch />
          <NetworkStatusIndicator />
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
