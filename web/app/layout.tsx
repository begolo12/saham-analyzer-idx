import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { AIChatbot } from "@/components/ai-chatbot";
import { CommandPalette } from "@/components/command-palette";
import "./globals.css";

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
  themeColor: "#1E88E5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen bg-background">
        {children}
        <Toaster position="top-center" richColors />
        <BottomNav />
        <KeyboardShortcuts />
        <ServiceWorkerRegister />
        <AIChatbot />
        <CommandPalette />
      </body>
    </html>
  );
}
