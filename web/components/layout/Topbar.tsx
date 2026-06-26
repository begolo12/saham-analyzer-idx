"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Star, BarChart3, Settings, Briefcase, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ReactNode } from "react";

interface TopbarProps {
  /** Extra content to render on the right side */
  trailing?: ReactNode;
  className?: string;
}

/**
 * Top bar for desktop layout.
 * Contains logo, nav items, search, and theme toggle.
 */
export function Topbar({ trailing, className }: TopbarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Beranda", icon: BarChart3 },
    { href: "/explore", label: "Jelajahi", icon: Compass },
    { href: "/watchlist", label: "Watchlist", icon: Star },
    { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  ];

  return (
    <header
      className={cn(
        "hidden md:flex items-center justify-between gap-4",
        "h-16 px-6 sticky top-0 z-50 w-full",
        "bg-[hsl(var(--card))]",
        "border-b border-border/50",
        "shadow-[0_4px_12px_rgba(0,0,0,0.06),0_-2px_8px_rgba(255,255,255,0.3)]",
        "dark:bg-[hsl(270_20%_12%)]",
        "dark:shadow-[0_4px_12px_rgba(0,0,0,0.2)]",
        "backdrop-blur-xl",
        className,
      )}
    >
      <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-[12px]",
            "bg-gradient-to-br from-bull-500 to-primary",
            "shadow-[4px_4px_8px_rgba(0,0,0,0.08),-4px_-4px_8px_rgba(255,255,255,0.5)]",
            "dark:shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.05)]",
            "transition-all duration-200 ease-spring group-hover:scale-105",
          )}
        >
          <BarChart3 className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-base leading-tight tracking-tight">SahamIDX</div>
          <div className="text-[10px] text-muted-foreground leading-tight">Analisis Saham</div>
        </div>
      </Link>

      <nav className="flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative inline-flex items-center gap-2 rounded-[12px] px-3 py-2 text-sm font-medium",
                "transition-all duration-200 ease-smooth",
                active
                  ? [
                      "bg-primary text-primary-foreground",
                      "shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.2)]",
                      "dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.03)]",
                    ]
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        {trailing}
        <ThemeToggle />
      </div>
    </header>
  );
}
