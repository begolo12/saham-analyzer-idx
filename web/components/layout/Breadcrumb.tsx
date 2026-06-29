"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Clay-style breadcrumb with pill segments.
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1.5 flex-wrap", className)}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <div key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                  "bg-secondary text-muted-foreground",
                  "shadow-[2px_2px_4px_rgba(0,0,0,0.04),-2px_-2px_4px_rgba(255,255,255,0.4)]",
                  "dark:shadow-[2px_2px_4px_rgba(0,0,0,0.15),-2px_-2px_4px_rgba(255,255,255,0.02)]",
                  "hover:text-foreground hover:bg-accent",
                  "hover:shadow-[3px_3px_6px_rgba(0,0,0,0.06),-3px_-3px_6px_rgba(255,255,255,0.5)]",
                  "dark:hover:shadow-[3px_3px_6px_rgba(0,0,0,0.2),-3px_-3px_6px_rgba(255,255,255,0.03)]",
                  "transition-all duration-200 ease-smooth",
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                  isLast
                    ? [
                        "bg-primary/10 text-primary font-semibold",
                        "shadow-[2px_2px_4px_rgba(0,0,0,0.04),-2px_-2px_4px_rgba(255,255,255,0.4)]",
                        "dark:shadow-[2px_2px_4px_rgba(0,0,0,0.15),-2px_-2px_4px_rgba(255,255,255,0.02)]",
                      ]
                    : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
