"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Star, BarChart3, Settings, Briefcase, Filter, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Desktop-only top header. On mobile, BottomNav takes over.
 */
export function TopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const navItems = [
    { href: "/", label: "Beranda", icon: BarChart3 },
    { href: "/screener", label: "Screener", icon: Filter },
    { href: "/watchlist", label: "Watchlist", icon: Star },
    { href: "/portfolio", label: "Portfolio", icon: Briefcase },
    { href: "/settings", label: "Pengaturan", icon: Settings },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const ticker = searchQuery.trim().toUpperCase().replace(".JK", "");
    if (ticker) {
      router.push(`/stock/${ticker}`);
      setSearchQuery("");
    }
  };

  return (
    <header className="hidden md:block sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-bull-500 to-primary shadow-md">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base leading-tight">SahamIDX</div>
            <div className="text-[10px] text-muted-foreground leading-tight">Analisis Saham</div>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 flex-1 max-w-md justify-end">
          <form onSubmit={handleSearch} className="flex-1 max-w-xs">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari saham (BBCA, TLKM...)"
                className="pl-9 pr-4 h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        </div>
      </div>
    </header>
  );
}
