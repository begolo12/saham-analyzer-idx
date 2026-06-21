import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorBanner({
  title = "Terjadi kesalahan",
  message,
  onRetry,
  className,
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3.5 py-3",
        "animate-fade-in",
        className,
      )}
    >
      <div className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
        <AlertCircle className="h-4 w-4 text-destructive" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-caption-1 font-semibold text-destructive uppercase tracking-wider">
          {title}
        </p>
        <p className="mt-0.5 text-footnote text-destructive/90 leading-relaxed">
          {message}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            "btn-base min-h-9 shrink-0 gap-1 rounded-full bg-destructive px-3.5",
            "text-[11px] font-semibold text-destructive-foreground hover:bg-destructive/90",
          )}
        >
          <RefreshCw className="h-3 w-3" aria-hidden />
          Coba lagi
        </button>
      )}
    </div>
  );
}
