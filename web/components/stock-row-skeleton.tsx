import { cn } from "@/lib/utils";

interface StockRowSkeletonProps {
  count?: number;
  showAvatar?: boolean;
  className?: string;
}

export function StockRowSkeleton({
  count = 5,
  showAvatar = false,
  className,
}: StockRowSkeletonProps) {
  return (
    <div className={cn("divide-y divide-border/40", className)} aria-label="Memuat data saham">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex min-h-12 items-center gap-3 px-4 py-2.5 animate-pulse"
        >
          {showAvatar && (
            <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
          )}
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-2.5 w-32 rounded bg-muted" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-3 w-12 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
