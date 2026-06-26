"use client";

import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[12px]",
        "bg-gradient-to-r from-[hsl(var(--card))] via-[hsl(var(--muted))] to-[hsl(var(--card))]",
        "dark:from-[hsl(270_15%_14%)] dark:via-[hsl(270_15%_20%)] dark:to-[hsl(270_15%_14%)]",
        "bg-[length:200%_100%]",
        "animate-shimmer",
        className,
      )}
      {...props}
    />
  );
}

export function StockCardSkeleton() {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card p-4",
        "shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.7)]",
        "dark:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.05)]",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="h-7 w-24 mb-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function RecommendationSkeleton() {
  return (
    <div
      className={cn(
        "rounded-xl p-6",
        "bg-secondary/50",
        "shadow-[4px_4px_8px_rgba(0,0,0,0.06),-4px_-4px_8px_rgba(255,255,255,0.5)]",
        "dark:shadow-[4px_4px_8px_rgba(0,0,0,0.2),-4px_-4px_8px_rgba(255,255,255,0.03)]",
      )}
    >
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = 400 }: { height?: number }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card p-4 overflow-hidden relative",
        "shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.7)]",
        "dark:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.05)]",
      )}
      style={{ height: `${height}px` }}
    >
      {/* Chart area skeleton with wave lines */}
      <div className="absolute inset-4">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between w-12">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-10" />
          ))}
        </div>
        {/* X-axis labels */}
        <div className="absolute bottom-0 left-14 right-0 flex justify-between">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-12" />
          ))}
        </div>
        {/* Chart line simulation */}
        <div className="absolute left-14 right-0 top-2 bottom-6 flex items-center">
          <div className="w-full h-[60%] relative overflow-hidden rounded-[12px]">
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--card))] via-[hsl(var(--muted))] to-[hsl(var(--card))] animate-shimmer" />
            {/* Fake candlestick bars */}
            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around px-2 h-full opacity-30">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 bg-muted-foreground/20 rounded-sm"
                  style={{ height: `${30 + Math.sin(i * 0.8) * 25 + Math.random() * 20}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function IndicatorSkeleton() {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-border/50 bg-card p-4 space-y-2",
        "shadow-[4px_4px_8px_rgba(0,0,0,0.06),-4px_-4px_8px_rgba(255,255,255,0.5)]",
        "dark:shadow-[4px_4px_8px_rgba(0,0,0,0.2),-4px_-4px_8px_rgba(255,255,255,0.03)]",
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

/** Full-page loading skeleton for stock detail */
export function StockDetailFullSkeleton() {
  return (
    <div className="space-y-4">
      {/* Mobile hero skeleton */}
      <div className="md:hidden">
        <div className="mobile-hero opacity-90">
          <div className="mobile-hero__label">Memuat</div>
          <div className="mobile-hero__value">···</div>
          <div className="mobile-hero__sub">Mengambil data saham</div>
        </div>
      </div>
      {/* Desktop hero skeleton */}
      <div className="hidden md:block page-hero-card p-4 sm:p-5">
        <div className="h-3 w-24 rounded bg-secondary shimmer" />
        <div className="mt-3 space-y-2">
          <div className="h-8 w-32 rounded-[12px] bg-secondary shimmer" />
          <div className="h-4 w-48 rounded bg-secondary shimmer" />
        </div>
      </div>
      <RecommendationSkeleton />
      {/* Score bars skeleton */}
      <div
        className={cn(
          "rounded-xl border border-border/50 bg-card p-4 space-y-4",
          "shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.7)]",
          "dark:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.05)]",
        )}
      >
        <Skeleton className="h-4 w-32" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
      {/* Metric cards skeleton */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-xl border border-border/50 bg-card p-3",
              "shadow-[4px_4px_8px_rgba(0,0,0,0.06),-4px_-4px_8px_rgba(255,255,255,0.5)]",
              "dark:shadow-[4px_4px_8px_rgba(0,0,0,0.2),-4px_-4px_8px_rgba(255,255,255,0.03)]",
              "animate-pulse",
            )}
          >
            <div className="h-2 w-12 rounded bg-muted" />
            <div className="mt-2 h-5 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
      <ChartSkeleton />
      {/* Tab skeleton */}
      <div
        className={cn(
          "rounded-xl border border-border/50 bg-card p-4 space-y-3",
          "shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.7)]",
          "dark:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.05)]",
        )}
      >
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-8 flex-1 rounded-full" />
          ))}
        </div>
        {[...Array(3)].map((_, i) => (
          <IndicatorSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
