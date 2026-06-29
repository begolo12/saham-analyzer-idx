"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Star, BarChart3, Settings, Briefcase, Compass, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

/**
 * Desktop-only top header with Claymorphism styling.
 * On mobile, BottomNav takes over.
 */
export function TopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const navItems = [
    { href: "/", label: "Beranda", icon: BarChart3 },
    { href: "/explore", label: "Jelajahi", icon: Compass },
    { href: "/watchlist", label: "Watchlist", icon: Star },
    { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const ticker = searchQuery.trim().toUpperCase().replace(".JK", "");
    if (ticker) {
      router.push(`/stock/${ticker}`);
      setSearchQuery("");
      inputRef.current?.blur();
    }
  };

  return (
    <header
      className={cn(
        "hidden md:block sticky top-0 z-50 w-full",
        "border-b border-border/50",
        "bg-[hsl(var(--background)_/_0.80)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[hsl(var(--background)_/_0.60)]",
        "shadow-[0_4px_12px_rgba(0,0,0,0.06)]",
        "dark:shadow-[0_4px_12px_rgba(0,0,0,0.2)]",
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 group"
        >
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-[12px]",
              "bg-gradient-to-br from-bull-500 to-primary",
              "shadow-[4px_4px_8px_rgba(0,0,0,0.08),-4px_-4px_8px_rgba(255,255,255,0.5)]",
              "dark:shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.05)]",
              "transition-all duration-200 ease-spring group-hover:scale-105",
            )}
          >
            <Sparkles className="h-5 w-5 text-white" />
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
                  "active:scale-95",
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
                <Icon className="h-4 w-4 transition-transform duration-fast ease-spring" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
          <form onSubmit={handleSearch} className="flex-1 max-w-xs">
            <div
              className={cn(
                "relative w-full group/search transition-all duration-200 ease-smooth",
                searchFocused && "max-w-sm scale-[1.02]",
              )}
            >
              <Search
                className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
                  "transition-colors duration-fast",
                  searchFocused ? "text-primary" : "text-muted-foreground",
                )}
              />
              <Input
                ref={inputRef}
                type="search"
                placeholder="Cari saham (BBCA, TLKM...)"
                className={cn(
                  "pl-9 pr-4 h-10 transition-all duration-200 ease-smooth",
                  searchFocused
                    ? "ring-2 ring-ring/20 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06),inset_-2px_-2px_4px_rgba(255,255,255,0.5),0_0_0_3px_rgba(147,130,220,0.12)]"
                    : "",
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </div>
          </form>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
