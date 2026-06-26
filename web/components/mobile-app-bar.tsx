"use client";

import Link from "next/link";
import { ChevronLeft, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MobileAppBarProps {
  title: string;
  subtitle?: ReactNode;
  backHref?: string;
  trailing?: ReactNode;
  /** A compact value chip on the right (e.g. price, total) */
  trailingValue?: ReactNode;
  /** A compact change text under trailingValue (e.g. +1.2%) */
  trailingChange?: ReactNode;
  /** Emphasize title — useful for ticker codes */
  emphasis?: "default" | "ticker";
  className?: string;
}

/**
 * MobileAppBar — iOS-style sticky app bar with Claymorphism.
 * Hidden on desktop. 64px tall on mobile.
 */
export function MobileAppBar({
  title,
  subtitle,
  backHref,
  trailing,
  trailingValue,
  trailingChange,
  emphasis = "default",
  className,
}: MobileAppBarProps) {
  return (
    <div
      className={cn(
        "md:hidden",
        "sticky top-0 z-35",
        "mx-[-1rem] mb-3",
        "bg-[hsl(var(--background)_/_0.96)] backdrop-blur-xl",
        "border-b border-border/60",
        "shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
        "dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          "py-2 px-2.5",
          "min-h-[3.25rem]",
        )}
      >
        {backHref && (
          <Link
            href={backHref}
            aria-label="Kembali"
            className={cn(
              "inline-flex items-center justify-center",
              "w-10 h-10 rounded-full",
              "text-primary",
              "bg-primary/8",
              "shadow-[3px_3px_6px_rgba(0,0,0,0.06),-3px_-3px_6px_rgba(255,255,255,0.5)]",
              "dark:shadow-[3px_3px_6px_rgba(0,0,0,0.2),-3px_-3px_6px_rgba(255,255,255,0.03)]",
              "transition-all duration-fast ease-smooth",
              "active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.08),inset_-2px_-2px_4px_rgba(255,255,255,0.3)]",
              "dark:active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.03)]",
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "truncate",
              emphasis === "ticker"
                ? "text-lg font-black tracking-tight tabular-nums"
                : "text-base font-extrabold tracking-tight",
            )}
          >
            {title}
          </div>
          {subtitle && (
            <div className="text-[11px] text-muted-foreground truncate mt-0.5 tracking-wide">
              {subtitle}
            </div>
          )}
        </div>
        {(trailingValue || trailing) && (
          <div className="flex shrink-0 items-center gap-2">
            {trailingValue && (
              <div className="text-right">
                <div className="text-sm font-black tabular-nums text-foreground">
                  {trailingValue}
                </div>
                {trailingChange && (
                  <div className="text-[10px] font-bold tabular-nums text-muted-foreground">
                    {trailingChange}
                  </div>
                )}
              </div>
            )}
            {trailing}
          </div>
        )}
      </div>
    </div>
  );
}

interface MobileQuickActionProps {
  label: string;
  icon: ReactNode;
  href: string;
  /** Optional subline for the icon (e.g. small subtitle) */
  description?: string;
  variant?: "default" | "primary";
  className?: string;
}

export function MobileQuickAction({
  label,
  icon,
  href,
  description,
  variant = "default",
  className,
}: MobileQuickActionProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl p-3.5",
        "border border-border/50",
        "transition-all duration-200 ease-smooth",
        "active:scale-[0.97]",
        "min-h-[72px]",
        variant === "primary"
          ? [
              "bg-gradient-to-br from-primary/5 to-primary/10",
              "dark:from-primary/10 dark:to-primary/5",
              "border-primary/20",
              "shadow-[6px_6px_12px_rgba(0,0,0,0.08),-6px_-6px_12px_rgba(255,255,255,0.6)]",
              "dark:shadow-[6px_6px_12px_rgba(0,0,0,0.25),-6px_-6px_12px_rgba(255,255,255,0.04)]",
            ]
          : [
              "bg-[hsl(var(--card))]",
              "shadow-[6px_6px_12px_rgba(0,0,0,0.08),-6px_-6px_12px_rgba(255,255,255,0.6)]",
              "dark:shadow-[6px_6px_12px_rgba(0,0,0,0.25),-6px_-6px_12px_rgba(255,255,255,0.04)]",
              "hover:shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.7)]",
              "dark:hover:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.05)]",
              "hover:-translate-y-[1px]",
            ],
        className,
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]",
          "transition-transform duration-fast ease-spring group-hover:scale-105",
          variant === "primary"
            ? "bg-primary/10 text-primary dark:bg-primary/20"
            : "bg-secondary text-muted-foreground",
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-bold text-foreground leading-tight">{label}</div>
        {description && (
          <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{description}</div>
        )}
      </div>
    </Link>
  );
}

interface MobileSectionTabsProps<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<{ value: T; label: string; icon?: ReactNode; count?: number }>;
  className?: string;
}

export function MobileSectionTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: MobileSectionTabsProps<T>) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 overflow-x-auto no-scrollbar",
        "p-0.5 rounded-full",
        "bg-secondary/60",
        "shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06),inset_-2px_-2px_4px_rgba(255,255,255,0.5)]",
        "dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.03)]",
        className,
      )}
      role="tablist"
      aria-label="Section"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5",
              "px-3.5 py-2 rounded-full",
              "text-xs font-semibold",
              "whitespace-nowrap",
              "transition-all duration-200 ease-smooth",
              active
                ? [
                    "bg-background text-foreground",
                    "shadow-[3px_3px_6px_rgba(0,0,0,0.08),-3px_-3px_6px_rgba(255,255,255,0.6)]",
                    "dark:shadow-[3px_3px_6px_rgba(0,0,0,0.25),-3px_-3px_6px_rgba(255,255,255,0.04)]",
                  ]
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.icon && <span className="inline-flex items-center justify-center">{option.icon}</span>}
            <span>{option.label}</span>
            {typeof option.count === "number" && (
              <span
                className={cn(
                  "inline-flex items-center justify-center",
                  "min-w-[1.25rem] h-5 rounded-full px-1.5",
                  "text-[11px] font-bold",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface MobileActionBarProps {
  primary: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    ariaLabel?: string;
  };
  secondary?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    ariaLabel?: string;
  };
  /** Show only primary on right (default false = secondary on left) */
  primaryOnly?: boolean;
  className?: string;
}

export function MobileActionBar({
  primary,
  secondary,
  primaryOnly = false,
  className,
}: MobileActionBarProps) {
  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-38 md:hidden",
        "px-3 py-2.5",
        "pointer-events-none",
        className,
      )}
      style={{ bottom: "var(--bottom-nav-safe-offset)" }}
    >
      <div
        className={cn(
          "flex gap-2 p-1.5 rounded-xl pointer-events-auto",
          "bg-[hsl(var(--card))] border border-border/50",
          "shadow-[8px_8px_16px_rgba(0,0,0,0.12),-8px_-8px_16px_rgba(255,255,255,0.7)]",
          "dark:shadow-[8px_8px_16px_rgba(0,0,0,0.35),-8px_-8px_16px_rgba(255,255,255,0.05)]",
        )}
      >
        {secondary && !primaryOnly && (
          <button
            type="button"
            onClick={secondary.onClick}
            aria-label={secondary.ariaLabel || secondary.label}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-1.5",
              "h-11 rounded-[12px] px-4",
              "text-sm font-bold",
              "bg-secondary text-secondary-foreground",
              "shadow-[3px_3px_6px_rgba(0,0,0,0.06),-3px_-3px_6px_rgba(255,255,255,0.5)]",
              "dark:shadow-[3px_3px_6px_rgba(0,0,0,0.2),-3px_-3px_6px_rgba(255,255,255,0.03)]",
              "active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.08),inset_-2px_-2px_4px_rgba(255,255,255,0.3)]",
              "dark:active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.03)]",
              "transition-all duration-200 ease-smooth",
            )}
          >
            {secondary.icon && <span className="inline-flex">{secondary.icon}</span>}
            <span>{secondary.label}</span>
          </button>
        )}
        <button
          type="button"
          onClick={primary.onClick}
          aria-label={primary.ariaLabel || primary.label}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-1.5",
            "h-11 rounded-[12px] px-4",
            "text-sm font-bold",
            "bg-primary text-primary-foreground",
            "shadow-[4px_4px_8px_rgba(0,0,0,0.08),-4px_-4px_8px_rgba(255,255,255,0.5)]",
            "dark:shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.05)]",
            "active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)]",
            "dark:active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]",
            "transition-all duration-200 ease-smooth",
          )}
        >
          {primary.icon && <span className="inline-flex">{primary.icon}</span>}
          <span>{primary.label}</span>
        </button>
      </div>
    </div>
  );
}

interface MobileStatRowItem {
  label: string;
  value: string;
  tone?: "default" | "bull" | "bear" | "neutral" | "primary";
}

export function MobileStatRow({ items }: { items: MobileStatRowItem[] }) {
  return (
    <div className="mobile-stat-row">
      {items.map((item) => (
        <div key={item.label} className="mobile-stat-row__cell">
          <div className="mobile-stat-row__label">{item.label}</div>
          <div
            className={cn(
              "mobile-stat-row__value",
              item.tone === "bull" && "text-bull-600",
              item.tone === "bear" && "text-bear-600",
              item.tone === "primary" && "text-primary",
              item.tone === "neutral" && "text-muted-foreground",
            )}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

interface MobileListItemProps {
  href: string;
  ticker: string;
  name?: string;
  sector?: string;
  price?: string;
  change?: { text: string; positive: boolean };
  accessory?: ReactNode;
  /** Add bottom-border dividers between items */
  divided?: boolean;
  className?: string;
}

export function MobileListItem({
  href,
  ticker,
  name,
  sector,
  price,
  change,
  accessory,
  divided = true,
  className,
}: MobileListItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "mobile-list-item",
        divided && "mobile-list-item--divided",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-black tabular-nums tracking-tight">{ticker}</span>
        </div>
        {(name || sector) && (
          <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            {name && <span className="truncate font-medium text-foreground/70">{name}</span>}
            {sector && name && <span className="opacity-60">·</span>}
            {sector && <span className="truncate">{sector}</span>}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 tabular-nums">
        {price && <span className="text-sm font-semibold">{price}</span>}
        {change && (
          <span
            className={cn(
              "min-w-12 text-right text-[11px] font-bold",
              change.positive ? "text-bull-600" : "text-bear-600",
            )}
          >
            {change.text}
          </span>
        )}
        {accessory}
      </div>
    </Link>
  );
}

interface MobileSegmentedTabsProps<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  /** Optional subline shown under segment */
  subline?: string;
  className?: string;
}

export function MobileSegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  subline,
  className,
}: MobileSegmentedTabsProps<T>) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="mobile-segmented" role="tablist" aria-label="View">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(option.value)}
              className={cn("mobile-segmented__btn", active && "mobile-segmented__btn--active")}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {subline && (
        <div className="text-[11px] text-muted-foreground">{subline}</div>
      )}
    </div>
  );
}

/** Convenience wrapper around the lollipop icon used by older sections. */
export function MobileMoreChip() {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground">
      <MoreHorizontal className="h-4 w-4" />
    </span>
  );
}
