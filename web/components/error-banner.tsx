import { AlertCircle } from "lucide-react";
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
        "flex items-start gap-3 rounded-xl border border-bear-500/30 bg-bear-500/10 px-3 py-2.5",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-bear-600 dark:text-bear-400" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-bear-700 dark:text-bear-300">{title}</p>
        <p className="mt-0.5 text-[11px] text-bear-700/80 dark:text-bear-300/80">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-bear-600 px-3 text-[11px] font-semibold text-white hover:bg-bear-700"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}
