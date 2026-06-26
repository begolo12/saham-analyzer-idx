"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { Loader2 } from "lucide-react";

/**
 * Loading fallback shown while a lazy-loaded component is being fetched.
 */
export function LoadingFallback({
  label = "Memuat...",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-2 py-8 text-muted-foreground ${className}`}
      role="status"
      aria-label={label}
    >
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/**
 * Full-page loading skeleton for page-level dynamic imports.
 */
export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="h-14 bg-muted/50 border-b" />
      <div className="container py-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-4 w-72 bg-muted/60 rounded" />
        <div className="grid gap-4 mt-6">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-48 bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Create a dynamically imported component with a loading fallback.
 *
 * Usage:
 * ```tsx
 * const HeavyChart = createLazyComponent(() => import("@/components/heavy-chart"));
 * // <HeavyChart /> renders with a spinner while loading
 * ```
 */
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallbackLabel?: string,
) {
  return dynamic(importFn, {
    loading: () => <LoadingFallback label={fallbackLabel} />,
    ssr: false,
  });
}
