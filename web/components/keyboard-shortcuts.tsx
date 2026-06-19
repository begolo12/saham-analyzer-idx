"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const STORAGE_KEY = "saham_keyboard_shortcuts_seen";

interface Shortcut {
  keys: string;
  description: string;
  action: () => void;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  // Build shortcut list (action evaluated lazily to avoid SSR issues)
  const shortcuts: Shortcut[] = [
    {
      keys: "/",
      description: "Fokus ke pencarian saham",
      action: () => {
        const searchInput = document.querySelector(
          'input[type="search"], input[placeholder*="BBCA"], input[placeholder*="Cari"]',
        ) as HTMLInputElement | null;
        searchInput?.focus();
        searchInput?.select();
      },
    },
    {
      keys: "g + h",
      description: "Pergi ke Beranda",
      action: () => router.push("/"),
    },
    {
      keys: "g + w",
      description: "Pergi ke Watchlist",
      action: () => router.push("/watchlist"),
    },
    {
      keys: "g + p",
      description: "Pergi ke Portfolio",
      action: () => router.push("/portfolio"),
    },
    {
      keys: "g + s",
      description: "Pergi ke Screener",
      action: () => router.push("/screener"),
    },
    {
      keys: "g + c",
      description: "Pergi ke Compare",
      action: () => router.push("/compare"),
    },
    {
      keys: "g + x",
      description: "Pergi ke Settings",
      action: () => router.push("/settings"),
    },
    {
      keys: "?",
      description: "Tampilkan shortcut ini",
      action: () => setShowHelp(true),
    },
    {
      keys: "Esc",
      description: "Tutup dialog / modal",
      action: () => {
        // Close any open modal by clicking backdrop or pressing close button
        const closeBtn = document.querySelector(
          '[aria-label*="close" i], [aria-label*="tutup" i]',
        ) as HTMLElement | null;
        closeBtn?.click();
        setShowHelp(false);
      },
    },
  ];

  useEffect(() => {
    let lastKey = "";
    let lastKeyTime = 0;

    function isTyping(target: EventTarget | null): boolean {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        el.isContentEditable
      );
    }

    function handler(e: KeyboardEvent) {
      const now = Date.now();

      // Escape works anywhere
      if (e.key === "Escape") {
        const escape = shortcuts.find((s) => s.keys === "Esc");
        if (escape) {
          escape.action();
        }
        return;
      }

      // Skip shortcut handlers when typing (except for specific cases)
      if (isTyping(e.target)) {
        // Allow "/" to focus search even when in input (handled separately)
        return;
      }

      // "?" — show help (Shift + /)
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowHelp(true);
        try {
          localStorage.setItem(STORAGE_KEY, "1");
        } catch {
          // ignore
        }
        return;
      }

      // "/" — focus search
      if (e.key === "/") {
        e.preventDefault();
        const slash = shortcuts.find((s) => s.keys === "/");
        slash?.action();
        return;
      }

      // Two-key sequences (g + x)
      if (lastKey === "g" && now - lastKeyTime < 1000) {
        const combo = shortcuts.find((s) => s.keys === `g + ${e.key.toLowerCase()}`);
        if (combo) {
          e.preventDefault();
          combo.action();
          lastKey = "";
          lastKeyTime = 0;
          return;
        }
      }

      // Track first key of potential combo
      if (e.key.toLowerCase() === "g") {
        lastKey = "g";
        lastKeyTime = now;
      } else {
        lastKey = "";
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Show hint on first visit
  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        // Don't auto-popup — only show when user presses ?
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <>
      {/* Floating button to show shortcuts (bottom-right corner) */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-20 right-16 z-30 md:bottom-4 md:right-16 inline-flex items-center justify-center w-10 h-10 rounded-full bg-card border shadow-lg hover:bg-accent transition-colors"
        aria-label="Tampilkan keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="h-4 w-4" />
      </button>

      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
        >
          <Card className="w-full max-w-md p-6 relative bg-gradient-to-br from-background to-primary/5 border-2 border-primary/20 shadow-2xl">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Keyboard className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-black">Keyboard Shortcuts</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Navigasi lebih cepat dengan keyboard
            </p>

            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {shortcuts.map((s) => (
                <div
                  key={s.keys}
                  className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <kbd className="font-mono text-xs px-2 py-1 bg-muted rounded border shadow-sm min-w-16 text-center">
                    {s.keys}
                  </kbd>
                  <span className="text-sm text-muted-foreground flex-1 text-right">
                    {s.description}
                  </span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => setShowHelp(false)}
              className="w-full mt-4"
              variant="outline"
            >
              Tutup (Esc)
            </Button>
          </Card>
        </div>
      )}
    </>
  );
}
