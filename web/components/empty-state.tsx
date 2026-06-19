"use client";

import { Search } from "lucide-react";
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
}

/**
 * EmptyState — consistent empty placeholder across the app.
 * - role="status" so screen readers announce
 * - Touch-target min-h-10 for primary CTA
 * - Title as h3 for semantic hierarchy
 */
export function EmptyState({
  icon,
  title,
  description,
  actions = [],
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center px-4 py-10 text-center",
        className,
      )}
    >
      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Search className="h-6 w-6" aria-hidden />}
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-xs text-[11px] text-muted-foreground">
          {description}
        </p>
      )}

      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              className={cn(
                "inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-colors",
                a.variant === "secondary"
                  ? "bg-muted text-foreground hover:bg-accent"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      )}

      {children && <div className="mt-4 w-full">{children}</div>}
    </div>
  );
}
