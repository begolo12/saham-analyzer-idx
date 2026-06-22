"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  Star,
  Briefcase,
  Grid2X2,
  Filter,
  Scale,
  FlaskConical,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const primaryTabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
];

const toolLinks = [
  { href: "/screener", label: "Screener", icon: Filter, description: "Scan peluang cepat" },
  { href: "/compare", label: "Compare", icon: Scale, description: "Bandingkan 2-3 saham" },
  { href: "/backtest", label: "Backtest", icon: FlaskConical, description: "Uji strategi historis" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Atur preferensi & data" },
];

function isPathActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

export function BottomNav() {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(false);

  const activeTool = useMemo(
    () => toolLinks.find((link) => isPathActive(pathname, link.href)),
    [pathname],
  );

  const closeTools = () => setToolsOpen(false);

  return (
    <>
      {toolsOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            aria-label="Tutup menu tools"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={closeTools}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[1.75rem] border border-border/70 bg-background px-4 pb-5 pt-4 shadow-2xl safe-area-bottom animate-slide-up">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="page-eyebrow">Tools</div>
                <div className="text-base font-bold">Aksi lanjutan</div>
              </div>
              <button
                type="button"
                aria-label="Tutup"
                onClick={closeTools}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {toolLinks.map((tool) => {
                const Icon = tool.icon;
                const active = isPathActive(pathname, tool.href);
                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    onClick={closeTools}
                    className={cn(
                      "rounded-2xl border p-3 transition-colors",
                      active
                        ? "border-primary bg-primary/10"
                        : "bg-card hover:bg-accent/50",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-2xl",
                          active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold">{tool.label}</div>
                        <div className="text-[11px] text-muted-foreground">{tool.description}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 overflow-x-hidden border-t border-border/70 bg-background/95 backdrop-blur-xl safe-area-bottom [touch-action:pan-y] md:hidden">
        <div className="mx-auto grid h-[4.5rem] max-w-xl grid-cols-5 px-2">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isPathActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition-all",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {active && (
                  <span className="absolute inset-x-4 top-1 h-1 rounded-full bg-primary/90" />
                )}
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-2xl transition-all",
                    active ? "bg-primary/12" : "bg-transparent",
                  )}
                >
                  <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span>{tab.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setToolsOpen(true)}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition-all",
              activeTool ? "text-primary" : "text-muted-foreground",
            )}
            aria-label="Buka menu tools"
            aria-expanded={toolsOpen}
          >
            {activeTool && (
              <span className="absolute inset-x-4 top-1 h-1 rounded-full bg-primary/90" />
            )}
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-2xl transition-all",
                activeTool ? "bg-primary/12" : "bg-transparent",
              )}
            >
              <Grid2X2 className={cn("h-5 w-5 transition-transform", activeTool && "scale-110")} strokeWidth={activeTool ? 2.5 : 2} />
            </div>
            <span>Tools</span>
          </button>
        </div>
      </nav>

      <div className="h-[4.5rem] md:hidden" aria-hidden="true" />
    </>
  );
}
