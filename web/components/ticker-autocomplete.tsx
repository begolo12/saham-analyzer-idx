"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, Loader2, X } from "lucide-react";
import { POPULAR_STOCKS, type PopularStock } from "@/lib/popular-stocks";
import { cn } from "@/lib/utils";

export interface TickerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (stock: PopularStock) => void;
  placeholder?: string;
  autoFocus?: boolean;
  excludeTickers?: string[];
  id?: string;
  disabled?: boolean;
}

/**
 * Reusable ticker combobox. Filters POPULAR_STOCKS by code/name/sector and
 * surfaces ARIA-compliant suggestions with keyboard navigation.
 *
 * Pure-React, no combobox library. Mirrors the pattern from stock-search.tsx
 * but adds: keyboard nav, click-outside, highlight match, empty fallback row,
 * popular picks when empty, and ARIA combobox pattern.
 */
export function TickerAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "BBCA",
  autoFocus = false,
  excludeTickers = [],
  id = "ticker-autocomplete",
  disabled = false,
}: TickerAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute suggestions — empty input returns first 8 popular (excluding filtered).
  const suggestions = useMemo(() => {
    const excluded = new Set(excludeTickers.map((t) => t.toUpperCase()));
    const q = value.trim().toUpperCase();

    if (!q) {
      return POPULAR_STOCKS.filter((s) => !excluded.has(s.code)).slice(0, 8);
    }

    return POPULAR_STOCKS.filter(
      (s) =>
        !excluded.has(s.code) &&
        (s.code.toUpperCase().includes(q) ||
          s.name.toUpperCase().includes(q) ||
          s.sector.toUpperCase().includes(q)),
    ).slice(0, 8);
  }, [value, excludeTickers]);

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlight(0);
  }, [value, open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const showDropdown = open && !disabled;
  const hasExactMatch =
    suggestions.length > 0 && suggestions[0].code === value.trim().toUpperCase();
  const showEmptyFallback = value.trim().length > 0 && suggestions.length === 0;

  const commit = (stock: PopularStock | null) => {
    if (stock) {
      onChange(stock.code);
      onSelect?.(stock);
    }
    setOpen(false);
    inputRef.current?.blur();
  };

  const commitFreeText = () => {
    // User typed a ticker that's not in POPULAR_STOCKS — just keep the value.
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      // If dropdown open and we have a suggestion, pick it. Otherwise submit form freely.
      if (open && suggestions[highlight]) {
        e.preventDefault();
        commit(suggestions[highlight]);
      } else if (open && showEmptyFallback) {
        e.preventDefault();
        commitFreeText();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  // Highlight matching substring in code/name (returns React-friendly array of nodes).
  const highlightMatch = (text: string): React.ReactNode => {
    const q = value.trim();
    if (!q) return text;
    const upper = text.toUpperCase();
    const upperQ = q.toUpperCase();
    const idx = upper.indexOf(upperQ);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary/20 text-foreground font-semibold rounded-sm px-0.5">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={value}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={
            showDropdown && suggestions[highlight]
              ? `${id}-option-${highlight}`
              : undefined
          }
          className={cn(
            "flex h-12 w-full rounded-xl border border-input bg-background pl-11 pr-10 py-2 text-base ring-offset-background",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50 transition-colors uppercase",
          )}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
              setOpen(true);
            }}
            aria-label="Clear ticker"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-xl border bg-popover shadow-xl z-50 overflow-hidden animate-fade-in"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {!value.trim() && (
            <div className="px-4 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
              💡 Saham Populer
            </div>
          )}

          <ul
            id={`${id}-listbox`}
            role="listbox"
            aria-label="Saham rekomendasi"
            className="max-h-80 overflow-y-auto"
          >
            {suggestions.map((stock, i) => (
              <li
                key={stock.code}
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={highlight === i}
              >
                <button
                  type="button"
                  onClick={() => commit(stock)}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-4 py-3 transition-colors text-left border-b last:border-0",
                    highlight === i
                      ? "bg-accent"
                      : "hover:bg-accent/50",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm">
                      {highlightMatch(stock.code)}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {highlightMatch(stock.name)}
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground shrink-0 px-2 py-0.5 rounded-full bg-muted">
                    {stock.sector}
                  </span>
                </button>
              </li>
            ))}

            {showEmptyFallback && (
              <li>
                <button
                  type="button"
                  onClick={commitFreeText}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:bg-accent text-left border-b last:border-0"
                >
                  <Search className="h-3.5 w-3.5" />
                  Tidak ada hasil untuk <strong className="text-foreground ml-1">&quot;{value}&quot;</strong>.
                  <span className="ml-auto text-xs">Tekan Enter untuk pakai kode ini</span>
                </button>
              </li>
            )}

            {value.trim() && suggestions.length > 0 && !hasExactMatch && (
              <li className="px-4 py-2 text-[10px] text-muted-foreground bg-muted/30 border-t">
                Tekan <kbd className="px-1 py-0.5 rounded bg-background border">Enter</kbd> untuk pakai teks saat ini
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
