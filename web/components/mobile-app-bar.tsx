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
 * MobileAppBar — the proper iOS-style sticky app bar for primary screens.
 * Replaces the previous thin "mobile-topbar" pattern. Hidden on desktop.
 * 64px tall on mobile (matches Apple HIG top bar height) with safe-area top.
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
    <div className={cn("mobile-app-bar md:hidden", className)}>
      <div className="mobile-app-bar__inner">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {backHref && (
            <Link
              href={backHref}
              aria-label="Kembali"
              className="mobile-app-bar__back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "truncate",
                emphasis === "ticker"
                  ? "mobile-app-bar__ticker"
                  : "mobile-app-bar__title",
              )}
            >
              {title}
            </div>
            {subtitle && (
              <div className="mobile-app-bar__subtitle truncate">{subtitle}</div>
            )}
          </div>
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
      className={cn("mobile-quick-action", variant === "primary" && "mobile-quick-action--primary", className)}
    >
      <div className="mobile-quick-action__icon">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="mobile-quick-action__label">{label}</div>
        {description && (
          <div className="mobile-quick-action__desc">{description}</div>
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
      className={cn("mobile-section-tabs no-scrollbar", className)}
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
              "mobile-section-tab",
              active && "mobile-section-tab--active",
            )}
          >
            {option.icon && <span className="mobile-section-tab__icon">{option.icon}</span>}
            <span>{option.label}</span>
            {typeof option.count === "number" && (
              <span
                className={cn(
                  "mobile-section-tab__count",
                  active && "mobile-section-tab__count--active",
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
    <div className={cn("mobile-action-bar md:hidden", className)}>
      <div className="mobile-action-bar__panel">
        {secondary && !primaryOnly && (
          <button
            type="button"
            onClick={secondary.onClick}
            aria-label={secondary.ariaLabel || secondary.label}
            className="mobile-action-bar__btn mobile-action-bar__btn--secondary"
          >
            {secondary.icon && <span className="mobile-action-bar__icon">{secondary.icon}</span>}
            <span className="mobile-action-bar__label">{secondary.label}</span>
          </button>
        )}
        <button
          type="button"
          onClick={primary.onClick}
          aria-label={primary.ariaLabel || primary.label}
          className="mobile-action-bar__btn mobile-action-bar__btn--primary"
        >
          {primary.icon && <span className="mobile-action-bar__icon">{primary.icon}</span>}
          <span className="mobile-action-bar__label">{primary.label}</span>
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
