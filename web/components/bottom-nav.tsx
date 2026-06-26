"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  Compass,
  Star,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/explore", label: "Jelajahi", icon: Compass },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
];

function isPathActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

export function BottomNav() {
  const pathname = usePathname();
  const tabRefs = useRef<(HTMLElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const activeIndex = tabs.findIndex((t) => isPathActive(pathname, t.href));

  useEffect(() => {
    if (activeIndex < 0) {
      setIndicator({ left: 0, width: 0 });
      return;
    }
    const el = tabRefs.current[activeIndex];
    if (el) {
      const parent = el.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        setIndicator({
          left: elRect.left - parentRect.left + elRect.width / 2 - 12,
          width: 24,
        });
      }
    }
  }, [activeIndex, pathname]);

  return (
    <>
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 overflow-x-hidden",
          "border-t border-border/50",
          "bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60",
          "safe-area-bottom [touch-action:pan-y] md:hidden",
          "shadow-[0_-1px_0_hsl(var(--border)/0.4),0_-4px_24px_hsl(var(--background)/0.5)]",
        )}
      >
        {/* Active tab indicator — smooth animated pill */}
        <div className="relative mx-auto max-w-xl">
          <div
            className="absolute top-0 h-[3px] rounded-full bg-primary transition-all duration-base ease-spring"
            style={{
              left: indicator.left,
              width: indicator.width,
              opacity: indicator.width > 0 ? 1 : 0,
              transform: indicator.width > 0 ? "scaleX(1)" : "scaleX(0)",
            }}
          />
        </div>

        <div className="mx-auto grid h-[4.5rem] max-w-xl grid-cols-4 px-1.5">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const active = isPathActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                ref={(el) => { tabRefs.current[idx] = el; }}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold",
                  "transition-all duration-base ease-spring",
                  "active:scale-90",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-2xl",
                    "transition-all duration-base ease-spring",
                    active
                      ? "bg-primary/12 shadow-xs shadow-primary/10"
                      : "bg-transparent group-hover:bg-accent/40",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-all duration-base ease-spring",
                      active && "scale-110",
                    )}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>
                <span
                  className={cn(
                    "transition-all duration-base ease-spring",
                    active ? "font-bold opacity-100" : "font-medium opacity-70",
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="h-[4.5rem] md:hidden" aria-hidden="true" />
    </>
  );
}
