"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SidebarItem {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: string | number;
}

interface SidebarProps {
  items: SidebarItem[];
  logo?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Sidebar navigation.
 * Desktop-only. Hidden on mobile (BottomNav takes over).
 */
export function Sidebar({ items, logo, footer, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col w-64 h-screen sticky top-0",
        "bg-[hsl(var(--card))] border-r border-border/50",
        "shadow-[4px_0_12px_rgba(0,0,0,0.06)]",
        "dark:bg-[hsl(270_20%_12%)]",
        "dark:shadow-[4px_0_12px_rgba(0,0,0,0.2)]",
        className,
      )}
    >
      {logo && (
        <div
          className={cn(
            "p-4 border-b border-border/50",
            "rounded-none",
          )}
        >
          {logo}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm font-medium",
                "transition-all duration-200 ease-smooth",
                active
                  ? [
                      "bg-primary text-primary-foreground",
                      "shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.2)]",
                      "dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.03)]",
                    ]
                  : [
                      "text-muted-foreground",
                      "hover:bg-accent hover:text-foreground",
                      "hover:shadow-[3px_3px_6px_rgba(0,0,0,0.06),-3px_-3px_6px_rgba(255,255,255,0.5)]",
                      "dark:hover:shadow-[3px_3px_6px_rgba(0,0,0,0.2),-3px_-3px_6px_rgba(255,255,255,0.03)]",
                    ],
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center min-w-[1.5rem] h-6 rounded-full px-1.5 text-[11px] font-bold",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {footer && (
        <div className="p-3 border-t border-border/50">
          {footer}
        </div>
      )}
    </aside>
  );
}
