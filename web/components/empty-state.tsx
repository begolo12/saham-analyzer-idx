"use client";

import {
  Search,
  Inbox,
  Star,
  Briefcase,
  AlertTriangle,
  TrendingDown,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
    icon?: React.ReactNode;
  }>;
  children?: React.ReactNode;
  className?: string;
  /** Predefined illustration context */
  illustration?: "search" | "inbox" | "watchlist" | "portfolio" | "no-results" | "error";
}

const ILLUSTRATIONS: Record<
  NonNullable<EmptyStateProps["illustration"]>,
  { icon: React.ComponentType<{ className?: string }>; bg: string }
> = {
  search: { icon: Search, bg: "bg-secondary" },
  inbox: { icon: Inbox, bg: "bg-secondary" },
  watchlist: {
    icon: Star,
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  portfolio: {
    icon: Briefcase,
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  "no-results": {
    icon: TrendingDown,
    bg: "bg-gray-100 dark:bg-gray-800/40",
  },
  error: {
    icon: AlertTriangle,
    bg: "bg-red-100 dark:bg-red-900/30",
  },
};

/**
 * EmptyState — consistent empty placeholder across the app.
 * Dual shadows and warm tones.
 */
export function EmptyState({
  icon,
  title,
  description,
  actions = [],
  children,
  className,
  illustration = "search",
}: EmptyStateProps) {
  const config = ILLUSTRATIONS[illustration];
  const IllustrationIcon = config.icon;

  const renderIcon = () => {
    if (icon) return icon;
    return <IllustrationIcon className="h-6 w-6" aria-hidden />;
  };

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center px-4 py-12 text-center",
        "rounded-xl",
        "bg-[hsl(var(--card))]",
        "shadow-[8px_8px_16px_rgba(0,0,0,0.08),-8px_-8px_16px_rgba(255,255,255,0.5)]",
        "dark:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.05)]",
        "border border-border/50",
        "animate-fade-in",
        className,
      )}
    >
      <div
        className={cn(
          "mb-4 inline-flex h-16 w-16 items-center justify-center rounded-xl",
          "text-muted-foreground",
          config.bg,
          "shadow-[4px_4px_8px_rgba(0,0,0,0.08),-4px_-4px_8px_rgba(255,255,255,0.5)]",
          "dark:shadow-[4px_4px_8px_rgba(0,0,0,0.25),-4px_-4px_8px_rgba(255,255,255,0.04)]",
        )}
      >
        {renderIcon()}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}

      {actions.length > 0 && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {actions.map((a, i) => (
            <Button
              key={i}
              variant={a.variant === "secondary" ? "secondary" : "primary"}
              size="sm"
              onClick={a.onClick}
            >
              {a.icon}
              {a.label}
            </Button>
          ))}
        </div>
      )}

      {children && <div className="mt-5 w-full">{children}</div>}
    </div>
  );
}
