"use client";

import { useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  onConfirm: () => void;
  onCancel?: () => void;
}

/**
 * ConfirmDialog — modal to replace window.confirm().
 * Features backdrop blur, keyboard accessible.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  variant = "primary",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button on open
  useEffect(() => {
    if (open) {
      setTimeout(() => cancelRef.current?.focus(), 50);
    }
  }, [open]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleConfirm = useCallback(() => {
    onConfirm();
    onOpenChange(false);
  }, [onConfirm, onOpenChange]);

  const handleCancel = useCallback(() => {
    onCancel?.();
    onOpenChange(false);
  }, [onCancel, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={handleCancel}
      />

      {/* Dialog */}
      <div
        className={cn(
          "relative w-full max-w-sm rounded-2xl bg-card p-6",
          "border border-border/50",
          "shadow-[12px_12px_24px_rgba(0,0,0,0.12),-12px_-12px_24px_rgba(255,255,255,0.8)]",
          "dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.06)]",
          "animate-scale-in",
        )}
      >
        {variant === "danger" && (
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
        )}

        <h3 className="text-lg font-bold text-card-foreground">{title}</h3>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3 justify-end">
          <Button
            ref={cancelRef}
            variant="secondary"
            size="sm"
            onClick={handleCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            size="sm"
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * useConfirm — hook to show a confirm dialog imperatively.
 * Returns a function that returns a Promise<boolean>.
 */
export function useConfirm() {
  // This is a simple wrapper for programmatic usage patterns.
  // For React state-based usage, use ConfirmDialog directly.
  return useCallback((message: string): boolean => {
    return window.confirm(message);
  }, []);
}
