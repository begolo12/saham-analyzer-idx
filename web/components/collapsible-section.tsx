"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  accessory?: React.ReactNode;
  subtitle?: string;
  defaultOpen?: boolean;
  storageKey?: string;
  action?: React.ReactNode;
  /** Add border + rounded background (for non-Card children) */
  framed?: boolean;
  children: React.ReactNode;
}

/**
 * CollapsibleSection — header button + content. Doesn't wrap in Card.
 * Use when child component renders its own Card (avoids nested cards).
 */
export function CollapsibleSection({
  title,
  icon,
  accessory,
  subtitle,
  defaultOpen = true,
  storageKey,
  action,
  framed = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!storageKey) return;
    setMounted(true);
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) setOpen(stored === "1");
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
    <section
      className={cn(
        framed && "rounded-xl border bg-card overflow-hidden",
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
          <span onClick={(e) => e.stopPropagation()} className="shrink-0 relative z-10">
            {/* Render as div (not Button) to avoid nesting buttons */}
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
      {open && <div className={framed ? "p-2" : ""}>{children}</div>}
    </section>
  );
}
