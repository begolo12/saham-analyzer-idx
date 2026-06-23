import { AlertTriangle, Info, XCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertProps {
  variant?: "info" | "warning" | "danger" | "success";
  children: React.ReactNode;
  className?: string;
  icon?: boolean;
}

const variantStyles = {
  info: "bg-primary/10 border-primary/25 text-foreground dark:bg-primary/15 dark:border-primary/30",
  warning: "bg-warning/10 border-warning/25 text-foreground dark:bg-warning/15 dark:border-warning/30",
  danger: "bg-destructive/10 border-destructive/25 text-foreground dark:bg-destructive/15 dark:border-destructive/30",
  success: "bg-success/10 border-success/25 text-foreground dark:bg-success/15 dark:border-success/30",
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
    <Alert variant="info" className="mb-4">
      <strong>⚠️ Disclaimer:</strong> Aplikasi ini adalah <strong>alat bantu analisa</strong>,
      bukan saran finansial. Semua keputusan investasi sepenuhnya tanggung jawab Anda.
      Selalu lakukan riset sendiri (DYOR).
    </Alert>
  );
}
