"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  // Semantic variants
  success: [
    "bg-emerald-100 text-emerald-700",
    "dark:bg-emerald-700/30 dark:text-emerald-400",
    "shadow-[2px_2px_4px_rgba(0,0,0,0.06),-2px_-2px_4px_rgba(255,255,255,0.5)]",
    "dark:shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.03)]",
  ],
  warning: [
    "bg-amber-100 text-amber-700",
    "dark:bg-amber-900/30 dark:text-amber-400",
    "shadow-[2px_2px_4px_rgba(0,0,0,0.06),-2px_-2px_4px_rgba(255,255,255,0.5)]",
    "dark:shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.03)]",
  ],
  danger: [
    "bg-red-100 text-red-700",
    "dark:bg-red-700/30 dark:text-red-400",
    "shadow-[2px_2px_4px_rgba(0,0,0,0.06),-2px_-2px_4px_rgba(255,255,255,0.5)]",
    "dark:shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.03)]",
  ],
  info: [
    "bg-blue-100 text-blue-700",
    "dark:bg-blue-900/30 dark:text-blue-400",
    "shadow-[2px_2px_4px_rgba(0,0,0,0.06),-2px_-2px_4px_rgba(255,255,255,0.5)]",
    "dark:shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.03)]",
  ],
  neutral: [
    "bg-gray-100 text-gray-700",
    "dark:bg-gray-700/30 dark:text-gray-400",
    "shadow-[2px_2px_4px_rgba(0,0,0,0.06),-2px_-2px_4px_rgba(255,255,255,0.5)]",
    "dark:shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.03)]",
  ],
  // Legacy aliases
  default: [
    "bg-primary text-primary-foreground",
    "shadow-[2px_2px_4px_rgba(0,0,0,0.06),-2px_-2px_4px_rgba(255,255,255,0.5)]",
    "dark:shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.03)]",
  ],
  bull: [
    "bg-emerald-100 text-emerald-700",
    "dark:bg-emerald-700/30 dark:text-emerald-400",
    "shadow-[2px_2px_4px_rgba(0,0,0,0.06),-2px_-2px_4px_rgba(255,255,255,0.5)]",
    "dark:shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.03)]",
  ],
  bear: [
    "bg-red-100 text-red-700",
    "dark:bg-red-700/30 dark:text-red-400",
    "shadow-[2px_2px_4px_rgba(0,0,0,0.06),-2px_-2px_4px_rgba(255,255,255,0.5)]",
    "dark:shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.03)]",
  ],
  secondary: [
    "bg-secondary text-secondary-foreground",
    "shadow-[2px_2px_4px_rgba(0,0,0,0.06),-2px_-2px_4px_rgba(255,255,255,0.5)]",
    "dark:shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.03)]",
  ],
  outline: [
    "border border-input text-foreground bg-transparent",
    "shadow-[2px_2px_4px_rgba(0,0,0,0.04),-2px_-2px_4px_rgba(255,255,255,0.4)]",
    "dark:shadow-[2px_2px_4px_rgba(0,0,0,0.15),-2px_-2px_4px_rgba(255,255,255,0.02)]",
  ],
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variants;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border-transparent px-2.5 py-0.5 text-xs font-semibold",
        "transition-all duration-200 ease-smooth",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
