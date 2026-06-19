"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Star, Briefcase, Settings, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/search", label: "Cari", icon: Search },
  { href: "/watchlist", label: "Watch", icon: Star },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/settings", label: "Setting", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-t safe-area-bottom">
        <div className="grid grid-cols-5 h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active =
              pathname === tab.href ||
              (tab.href !== "/" && pathname.startsWith(tab.href));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform",
                    active && "scale-110",
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom padding to prevent content from being hidden under bottom nav on mobile */}
      <div className="h-16 md:hidden" aria-hidden="true" />
    </>
  );
}
