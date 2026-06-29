"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleCardProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  accessory?: React.ReactNode;
  subtitle?: string;
  defaultOpen?: boolean;
  storageKey?: string;
  action?: React.ReactNode;
  density?: "tight" | "normal";
  accentColor?: string;
  children: React.ReactNode;
}

export function CollapsibleCard({
  title,
  icon,
  accessory,
  subtitle,
  defaultOpen = true,
  storageKey,
  action,
  density = "normal",
  accentColor,
  children,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(false);

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
    <div
      className={cn(
        "bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden",
        density === "tight" && "gap-0",
        accentColor && "border-l-[3px]",
        accentColor,
      )}
    >
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
        aria-expanded={open}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold truncate">{title}</h3>
            {accessory}
          </div>
          {subtitle && (
            <p className={cn(
              "text-[10px] text-muted-foreground truncate mt-0.5",
              !open && "line-clamp-1",
            )}>
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
            "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
            open && "rotate-180",
            !mounted && "opacity-0",
          )}
        />
      </button>
      {open && (
        <div
          className={cn(
            "px-4 pb-4",
            density === "tight" ? "pt-0" : "pt-1",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
