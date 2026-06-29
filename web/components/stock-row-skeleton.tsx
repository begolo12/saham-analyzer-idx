import { cn } from "@/lib/utils";

interface StockRowSkeletonProps {
  count?: number;
  showAvatar?: boolean;
  className?: string;
}

const shimmerBg =
  "linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted) / 0.5) 50%, hsl(var(--muted)) 75%)";
const shimmerSize = "200% 100%";

function SingleSkeletonRow({ showAvatar, index }: { showAvatar: boolean; index: number }) {
  // Realistic width variations for ticker names
  const tickerWidths = ["w-14", "w-16", "w-12", "w-[4.5rem]", "w-14"];
  const nameWidths = ["w-28", "w-36", "w-24", "w-32", "w-20"];
  const priceWidths = ["w-16", "w-14", "w-[4.5rem]", "w-16", "w-14"];
  const changeWidths = ["w-12", "w-14", "w-12", "w-10", "w-14"];

  const i = index % 5;

  const shimmerStyle = {
    backgroundImage: shimmerBg,
    backgroundSize: shimmerSize,
  };

  return (
    <div
      className="flex min-h-12 items-center gap-3 px-3 py-2.5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {showAvatar && (
        <div
          className="h-8 w-8 shrink-0 rounded-full animate-shimmer"
          style={{ ...shimmerStyle, opacity: 0.6 }}
        />
      )}
      <div className="flex-1 space-y-1.5">
        <div
          className={cn("h-3 rounded-md animate-shimmer", tickerWidths[i])}
          style={{ ...shimmerStyle, opacity: 0.6 }}
        />
        <div
          className={cn("h-2.5 rounded animate-shimmer", nameWidths[i])}
          style={{ ...shimmerStyle, opacity: 0.4 }}
        />
      </div>
      <div className="flex items-center gap-2">
        <div
          className={cn("h-3 rounded-md animate-shimmer", priceWidths[i])}
          style={{ ...shimmerStyle, opacity: 0.6 }}
        />
        <div
          className={cn("h-3 rounded-md animate-shimmer", changeWidths[i])}
          style={{ ...shimmerStyle, opacity: 0.4 }}
        />
      </div>
    </div>
  );
}

export function StockRowSkeleton({
  count = 5,
  showAvatar = false,
  className,
}: StockRowSkeletonProps) {
  return (
    <div
      className={cn("divide-y divide-border/40", className)}
      aria-label="Memuat data saham"
      role="status"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SingleSkeletonRow key={i} showAvatar={showAvatar} index={i} />
      ))}
    </div>
  );
}
