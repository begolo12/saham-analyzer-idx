"use client";

import { Search, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

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
  /** Optional illustration — overrides default icon container */
  illustration?: "search" | "inbox";
}

/**
 * EmptyState — consistent empty placeholder across the app.
 * - role="status" so screen readers announce
 * - Touch-target min-h-10 for primary CTA
 * - Title as h3 for semantic hierarchy
 * - Subtle scale-in animation, respects prefers-reduced-motion
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
  const renderIcon = () => {
    if (icon) return icon;
    if (illustration === "inbox") return <Inbox className="h-6 w-6" aria-hidden />;
    return <Search className="h-6 w-6" aria-hidden />;
  };

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center px-4 py-12 text-center animate-fade-in",
        className,
      )}
    >
      <div
        className={cn(
          "mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl",
          "bg-gradient-to-br from-muted to-accent text-muted-foreground",
          "shadow-xs ring-1 ring-border/50",
        )}
      >
        {renderIcon()}
      </div>
      <h3 className="text-title-3 text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-xs text-footnote text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}

      {actions.length > 0 && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              className={cn(
                "btn-base min-h-10 px-4 text-xs font-semibold",
                a.variant === "secondary"
                  ? "bg-secondary text-secondary-foreground hover:bg-accent border border-border/60"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
              )}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      )}

      {children && <div className="mt-5 w-full">{children}</div>}
    </div>
  );
}
