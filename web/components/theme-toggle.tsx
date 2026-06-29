"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  /** Show as segmented control (3 buttons) instead of single toggle */
  variant?: "toggle" | "segmented";
  className?: string;
}

/**
 * Clay-style theme toggle.
 * - toggle: single button that cycles light → dark → system
 * - segmented: 3-segment pill (like iOS Display & Brightness)
 */
export function ThemeToggle({ variant = "toggle", className }: ThemeToggleProps) {
  const { theme, setTheme, toggle, resolved } = useTheme();

  if (variant === "segmented") {
    return (
      <div
        className={cn(
          "inline-flex items-center rounded-full p-0.5",
          "bg-secondary",
          "shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06),inset_-2px_-2px_4px_rgba(255,255,255,0.5)]",
          "dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.03)]",
          className,
        )}
      >
        {(["light", "system", "dark"] as const).map((t) => {
          const Icon = t === "light" ? Sun : t === "dark" ? Moon : Monitor;
          const active = theme === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                "transition-all duration-200 ease-smooth",
                active
                  ? [
                      "bg-background text-foreground",
                      "shadow-[3px_3px_6px_rgba(0,0,0,0.08),-3px_-3px_6px_rgba(255,255,255,0.6)]",
                      "dark:shadow-[3px_3px_6px_rgba(0,0,0,0.25),-3px_-3px_6px_rgba(255,255,255,0.04)]",
                    ]
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label={
                t === "light"
                  ? "Mode terang"
                  : t === "dark"
                    ? "Mode gelap"
                    : "Ikuti sistem"
              }
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {t === "light" ? "Terang" : t === "dark" ? "Gelap" : "Sistem"}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // Simple toggle button — cycles through modes
  const Icon = resolved === "dark" ? Moon : Sun;
  const nextLabel = resolved === "dark" ? "Mode terang" : "Mode gelap";

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full",
        "transition-all duration-200 ease-smooth",
        "bg-[hsl(var(--secondary))] text-foreground",
        "shadow-[4px_4px_8px_rgba(0,0,0,0.08),-4px_-4px_8px_rgba(255,255,255,0.5)]",
        "dark:shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.05)]",
        "hover:shadow-[5px_5px_10px_rgba(0,0,0,0.1),-5px_-5px_10px_rgba(255,255,255,0.6)]",
        "dark:hover:shadow-[5px_5px_10px_rgba(0,0,0,0.35),-5px_-5px_10px_rgba(255,255,255,0.06)]",
        "hover:-translate-y-[1px]",
        "active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)]",
        "dark:active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]",
        "active:translate-y-0",
        className,
      )}
      aria-label={nextLabel}
      title={nextLabel}
    >
      <span
        className={cn(
          "transition-transform duration-300 ease-spring",
          resolved === "dark" ? "rotate-180" : "rotate-0",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
    </button>
  );
}
