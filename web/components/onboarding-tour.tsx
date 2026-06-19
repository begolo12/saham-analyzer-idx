"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  Star,
  Briefcase,
  BarChart3,
  Sparkles,
} from "lucide-react";

const STORAGE_KEY = "saham_onboarding_completed";

interface TourStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  emoji: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    emoji: "👋",
    icon: <Sparkles className="h-5 w-5 text-primary" />,
    title: "Selamat Datang di Saham Analyzer",
    description:
      "Aplikasi gratis untuk analisa saham IDX, track portfolio virtual, dan belajar investasi dengan data real-time.",
  },
  {
    emoji: "🔍",
    icon: <Search className="h-5 w-5 text-primary" />,
    title: "Cari Saham",
    description:
      "Ketik kode saham (contoh: BBCA, TLKM) di kolom pencarian di atas. Lihat harga, analisa teknikal, dan fundamental lengkap.",
  },
  {
    emoji: "⭐",
    icon: <Star className="h-5 w-5 text-amber-500" />,
    title: "Watchlist Saham Favorit",
    description:
      "Tambah saham yang Anda pantau ke Watchlist. Dapat alert otomatis saat menyentuh target harga.",
  },
  {
    emoji: "💼",
    icon: <Briefcase className="h-5 w-5 text-bull-500" />,
    title: "Track Portfolio Virtual",
    description:
      "Top Up modal → Beli/Jual saham → Lihat P&L real-time. Plus compare performa vs IHSG (pasar).",
  },
  {
    emoji: "📊",
    icon: <BarChart3 className="h-5 w-5 text-purple-500" />,
    title: "Sistem Self-Learning",
    description:
      "Setiap rekomendasi yang Anda lihat otomatis di-track. Setelah 1 hari, sistem evaluasi akurasi dan tune bobot sinyal.",
  },
];

interface OnboardingTourProps {
  /** Force show (for testing) */
  forceShow?: boolean;
}

export function OnboardingTour({ forceShow = false }: OnboardingTourProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceShow) {
      setOpen(true);
      setStep(0);
      return;
    }
    try {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) {
        // delay so it appears after page settles
        const t = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      // ignore
    }
  }, [forceShow]);

  const complete = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  };

  const skip = () => {
    complete();
  };

  const next = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      complete();
    }
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  // Expose reset method for dev
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { resetOnboarding?: () => void }).resetOnboarding =
        () => {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            // ignore
          }
          setStep(0);
          setOpen(true);
        };
    }
  }, []);

  if (!open) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding tour"
    >
      <Card className="w-full max-w-md p-6 relative bg-gradient-to-br from-background to-primary/5 border-2 border-primary/20 shadow-2xl">
        <button
          onClick={skip}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Skip tour"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-5">
          <div className="text-5xl mb-3" aria-hidden>
            {current.emoji}
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            {current.icon}
            <h2 className="text-lg font-black">{current.title}</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {TOUR_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Go to step ${i + 1}`}
              className={cn(
                "h-2 rounded-full transition-all",
                i === step ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={prev}
            disabled={isFirst}
            className={isFirst ? "invisible" : ""}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Kembali
          </Button>

          <span className="text-xs text-muted-foreground tabular-nums">
            {step + 1} / {TOUR_STEPS.length}
          </span>

          <Button size="sm" onClick={next} className="min-w-24">
            {isLast ? (
              "Mulai! 🚀"
            ) : (
              <>
                Lanjut
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>

        <button
          onClick={skip}
          className="block mx-auto mt-3 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Lewati tour
        </button>
      </Card>
    </div>
  );
}

/**
 * Hook for resetting onboarding (dev only).
 * Use: const reset = useResetOnboarding(); reset();
 */
export function useResetOnboarding() {
  return () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      window.location.reload();
    }
  };
}
