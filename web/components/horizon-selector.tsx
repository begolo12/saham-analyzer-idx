"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type HorizonKey = "1d" | "5d" | "20d";

interface HorizonSelectorProps<T extends string = HorizonKey> {
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<{
    value: T;
    label: string;
    badge?: string;
  }>;
  className?: string;
  ariaLabel?: string;
}

/**
 * HorizonSelector — 3-up segmented control for picking 1d/5d/20d (or any 3-option switch).
 * Used in recommendation hero + stock detail.
 */
export function HorizonSelector<T extends string = HorizonKey>({
  value,
  onChange,
  options,
  className,
  ariaLabel = "Pilih horizon",
}: HorizonSelectorProps<T>) {
  const [focusedIdx, setFocusedIdx] = useState(() =>
    Math.max(0, options.findIndex((o) => o.value === value)),
  );

  return (
    <div
      className={cn("horizon-selector", className)}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const next = (focusedIdx + dir + options.length) % options.length;
        setFocusedIdx(next);
        onChange(options[next].value);
      }}
    >
      {options.map((opt, idx) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={idx === focusedIdx ? 0 : -1}
            onClick={() => {
              setFocusedIdx(idx);
              onChange(opt.value);
            }}
            className={cn(
              "horizon-selector__btn",
              active && "horizon-selector__btn--active",
            )}
          >
            <span>{opt.label}</span>
            {opt.badge && <span className="horizon-selector__badge">{opt.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
