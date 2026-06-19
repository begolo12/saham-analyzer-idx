"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CollapsibleCardProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  /** Right-side accessory (badge, count, etc.) */
  accessory?: React.ReactNode;
  /** Subtitle shown when expanded */
  subtitle?: string;
  /** Default open state */
  defaultOpen?: boolean;
  /** Storage key to persist open state (across pages) */
  storageKey?: string;
  /** Optional right action button */
  action?: React.ReactNode;
  /** Compact density */
  density?: "tight" | "normal";
  children: React.ReactNode;
}

/**
 * CollapsibleCard — section header with click-to-expand.
 * Persists open state in localStorage if storageKey provided.
 */
export function CollapsibleCard({
  title,
  icon,
  accessory,
  subtitle,
  defaultOpen = true,
  storageKey,
  action,
  density = "normal",
  children,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(false);

  // Load persisted state
  useEffect(() => {
    if (!storageKey) return;
    setMounted(true);
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        setOpen(stored === "1");
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        // ignore
      }
    }
  };

  return (
    <Card
      className={cn(
        "overflow-hidden",
        density === "tight" && "gap-0",
      )}
    >
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-accent/40 transition-colors text-left"
        aria-expanded={open}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold truncate">{title}</h3>
            {accessory}
          </div>
          {open && subtitle && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <span onClick={(e) => e.stopPropagation()} className="shrink-0">
            {action}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
            open && "rotate-180",
            !mounted && "opacity-0",
          )}
        />
      </button>
      {open && (
        <div
          className={cn(
            "px-3 sm:px-4 pb-3",
            density === "tight" ? "pt-0" : "pt-1",
          )}
        >
          {children}
        </div>
      )}
    </Card>
  );
}
