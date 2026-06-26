"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger" | "ghost" | "default" | "outline" | "destructive";
    size?: "sm" | "md" | "lg" | "default" | "icon";
    loading?: boolean;
  }
>(({ className, variant = "primary", size = "md", loading = false, disabled, children, ...props }, ref) => {
  // Normalize legacy variants
  const normalizedVariant = variant === "default" ? "primary" : variant === "outline" ? "secondary" : variant === "destructive" ? "danger" : variant;
  const normalizedSize = size === "default" ? "md" : size === "icon" ? "md" : size;

  const variantStyles = {
    primary: [
      "bg-primary text-primary-foreground",
      "shadow-[4px_4px_8px_rgba(0,0,0,0.08),-4px_-4px_8px_rgba(255,255,255,0.5)]",
      "hover:shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.6)]",
      "hover:-translate-y-[1px]",
      "active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)]",
      "active:translate-y-0",
      "dark:shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.05)]",
      "dark:hover:shadow-[6px_6px_12px_rgba(0,0,0,0.4),-6px_-6px_12px_rgba(255,255,255,0.06)]",
      "dark:active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]",
    ],
    secondary: [
      "bg-secondary text-secondary-foreground",
      "border border-border/60",
      "shadow-[4px_4px_8px_rgba(0,0,0,0.08),-4px_-4px_8px_rgba(255,255,255,0.5)]",
      "hover:shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.6)]",
      "hover:-translate-y-[1px]",
      "active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)]",
      "active:translate-y-0",
      "dark:shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.05)]",
      "dark:hover:shadow-[6px_6px_12px_rgba(0,0,0,0.4),-6px_-6px_12px_rgba(255,255,255,0.06)]",
      "dark:active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]",
    ],
    danger: [
      "bg-destructive text-destructive-foreground",
      "shadow-[4px_4px_8px_rgba(0,0,0,0.08),-4px_-4px_8px_rgba(255,255,255,0.5)]",
      "hover:shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.6)]",
      "hover:-translate-y-[1px]",
      "active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)]",
      "active:translate-y-0",
      "dark:shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.05)]",
      "dark:hover:shadow-[6px_6px_12px_rgba(0,0,0,0.4),-6px_-6px_12px_rgba(255,255,255,0.06)]",
      "dark:active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]",
    ],
    ghost: [
      "bg-transparent text-foreground",
      "hover:bg-accent",
      "hover:shadow-[3px_3px_6px_rgba(0,0,0,0.06),-3px_-3px_6px_rgba(255,255,255,0.5)]",
      "dark:hover:shadow-[3px_3px_6px_rgba(0,0,0,0.2),-3px_-3px_6px_rgba(255,255,255,0.03)]",
      "active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)]",
      "dark:active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]",
    ],
  };

  const sizeStyles = {
    sm: "h-8 px-3 text-xs rounded-[12px]",
    md: size === "icon" ? "h-10 w-10 rounded-[12px]" : "h-10 px-4 text-sm rounded-[12px]",
    lg: "h-12 px-6 text-base rounded-[16px]",
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-bold",
        "border-none",
        "transition-all duration-200 ease-smooth",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variantStyles[normalizedVariant],
        sizeStyles[normalizedSize],
        loading && "relative text-transparent",
        className,
      )}
      {...props}
    >
      {children}
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      )}
    </button>
  );
});
Button.displayName = "Button";

export { Button };
