import { AlertTriangle, Info, XCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertProps {
  variant?: "info" | "warning" | "danger" | "success";
  children: React.ReactNode;
  className?: string;
  icon?: boolean;
}

const variantStyles = {
  info: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200",
  warning: "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200",
  danger: "bg-red-50 border-red-200 text-red-900 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200",
  success: "bg-green-50 border-green-200 text-green-900 dark:bg-green-950/30 dark:border-green-800 dark:text-green-200",
};

const variantIcons = {
  info: Info,
  warning: AlertTriangle,
  danger: XCircle,
  success: CheckCircle2,
};

export function Alert({ variant = "info", children, className, icon = true }: AlertProps) {
  const Icon = variantIcons[variant];
  return (
    <div className={cn(
      "rounded-xl border p-3 sm:p-4 text-sm",
      variantStyles[variant],
      className,
    )}>
      <div className="flex items-start gap-2 sm:gap-3">
        {icon && <Icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 mt-0.5" />}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

export function Disclaimer() {
  return (
    <Alert variant="danger" className="mb-4">
      <strong>⚠️ Disclaimer:</strong> Aplikasi ini adalah <strong>alat bantu analisa</strong>,
      bukan saran finansial. Semua keputusan investasi sepenuhnya tanggung jawab Anda.
      Selalu lakukan riset sendiri (DYOR).
    </Alert>
  );
}
