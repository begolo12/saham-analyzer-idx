"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
 * CollapsibleSection — header button + content with smooth height animation.
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
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);
  const [isAnimating, setIsAnimating] = useState(false);

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

  // Measure content height
  const measureHeight = useCallback(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
    }
  }, []);

  useEffect(() => {
    if (open) {
      // Measure after render
      requestAnimationFrame(() => {
        measureHeight();
      });
    }
  }, [open, children, measureHeight]);

  // Observe resize for dynamic content
  useEffect(() => {
    if (!open || !contentRef.current) return;
    const observer = new ResizeObserver(() => {
      measureHeight();
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [open, measureHeight]);

  const toggle = () => {
    const next = !open;
    setIsAnimating(true);

    // If closing, snapshot current height first
    if (!next && contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }

    // Small delay to allow height to be set before transitioning
    requestAnimationFrame(() => {
      setOpen(next);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, next ? "1" : "0");
        } catch {
          // ignore
        }
      }
      // End animation after transition
      setTimeout(() => setIsAnimating(false), 320);
    });
  };

  return (
    <section
      className={cn(
        framed && "rounded-2xl bg-card overflow-hidden",
        framed && "shadow-[0_1px_2px_hsl(222_25%_11%/0.04),0_2px_8px_hsl(222_25%_11%/0.05)]",
      )}
    >
      <button
        onClick={toggle}
        className={cn(
          "w-full flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3",
          "hover:bg-accent/40 active:bg-accent/60",
          "transition-colors duration-fast ease-spring text-left",
        )}
        aria-expanded={open}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold truncate">{title}</h3>
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
            "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-base ease-spring",
            open && "rotate-180",
            !mounted && "opacity-0",
          )}
        />
      </button>
      <div
        ref={contentRef}
        className={cn(
          "transition-[height,opacity] duration-base ease-spring overflow-hidden",
          !open && !isAnimating && "h-0",
          open && !isAnimating && "h-auto",
        )}
        style={
          isAnimating
            ? {
                height: open ? contentHeight : 0,
                opacity: open ? 1 : 0,
              }
            : open
              ? { opacity: 1 }
              : { opacity: 0 }
        }
        onTransitionEnd={() => {
          if (open && isAnimating) {
            setIsAnimating(false);
            setContentHeight(undefined);
          }
        }}
      >
        <div className={framed ? "p-2" : ""}>{children}</div>
      </div>
    </section>
  );
}
