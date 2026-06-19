"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  Search,
  Home,
  Briefcase,
  Star,
  Settings,
  Scale,
  FlaskConical,
  Filter,
  TrendingUp,
  Bot,
  Keyboard,
  ArrowRight,
  Plus,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { POPULAR_STOCKS } from "@/lib/popular-stocks";
import { useWatchlist, addToWatchlist } from "@/lib/watchlist-storage";

interface PaletteAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  /** Search keywords */
  keywords: string[];
  action: () => void;
  group: string;
}

const QUICK_ACTIONS: PaletteAction[] = [
  {
    id: "nav-home",
    label: "Beranda",
    description: "Halaman utama",
    icon: <Home className="h-4 w-4" />,
    keywords: ["home", "beranda", "dashboard"],
    action: () => {},
    group: "Navigasi",
  },
  {
    id: "nav-portfolio",
    label: "Portfolio",
    description: "Track investasi virtual",
    icon: <Briefcase className="h-4 w-4" />,
    keywords: ["portfolio", "portofolio", "investasi"],
    action: () => {},
    group: "Navigasi",
  },
  {
    id: "nav-watchlist",
    label: "Watchlist",
    description: "Saham favorit",
    icon: <Star className="h-4 w-4" />,
    keywords: ["watchlist", "favorit", "star"],
    action: () => {},
    group: "Navigasi",
  },
  {
    id: "nav-screener",
    label: "Screener",
    description: "Filter saham berdasarkan kriteria",
    icon: <Filter className="h-4 w-4" />,
    keywords: ["screener", "filter", "cari"],
    action: () => {},
    group: "Navigasi",
  },
  {
    id: "nav-compare",
    label: "Compare",
    description: "Bandingkan 2-3 saham",
    icon: <Scale className="h-4 w-4" />,
    keywords: ["compare", "bandingkan"],
    action: () => {},
    group: "Navigasi",
  },
  {
    id: "nav-backtest",
    label: "Backtest",
    description: "Test strategi trading",
    icon: <FlaskConical className="h-4 w-4" />,
    keywords: ["backtest", "strategi", "test"],
    action: () => {},
    group: "Navigasi",
  },
  {
    id: "nav-settings",
    label: "Settings",
    description: "Pengaturan sistem",
    icon: <Settings className="h-4 w-4" />,
    keywords: ["settings", "pengaturan", "konfigurasi"],
    action: () => {},
    group: "Navigasi",
  },
  {
    id: "action-shortcuts",
    label: "Keyboard Shortcuts",
    description: "Lihat semua shortcut",
    icon: <Keyboard className="h-4 w-4" />,
    keywords: ["shortcut", "keyboard", "tombol"],
    action: () => {},
    group: "Aksi",
  },
  {
    id: "action-chatbot",
    label: "Asisten AI",
    description: "Tanya portfolio, watchlist, dll.",
    icon: <Bot className="h-4 w-4" />,
    keywords: ["chatbot", "ai", "asisten", "bot"],
    action: () => {},
    group: "Aksi",
  },
];

const ROUTE_MAP: Record<string, string> = {
  "nav-home": "/",
  "nav-portfolio": "/portfolio",
  "nav-watchlist": "/watchlist",
  "nav-screener": "/screener",
  "nav-compare": "/compare",
  "nav-backtest": "/backtest",
  "nav-settings": "/settings",
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const { tickers: watchlistTickers, mounted: watchlistMounted } = useWatchlist();

  // Bind actions
  const allActions: PaletteAction[] = useMemo(() => {
    const baseActions = QUICK_ACTIONS.map((a) => ({
      ...a,
      action: () => {
        if (ROUTE_MAP[a.id]) {
          router.push(ROUTE_MAP[a.id]);
          return;
        }
        if (a.id === "action-shortcuts") {
          // Trigger keyboard shortcuts modal
          window.dispatchEvent(new CustomEvent("show-shortcuts"));
          return;
        }
        if (a.id === "action-chatbot") {
          // Trigger chatbot open
          window.dispatchEvent(new CustomEvent("open-chatbot"));
          return;
        }
      },
    }));

    // Add stock actions: navigate + add to watchlist
    const stockActions: PaletteAction[] = POPULAR_STOCKS.slice(0, 25).map((s) => ({
      id: `stock-${s.code}`,
      label: s.code,
      description: s.name,
      icon: <BarChart3 className="h-4 w-4" />,
      keywords: [s.code.toLowerCase(), s.name.toLowerCase(), s.sector.toLowerCase()],
      action: () => router.push(`/stock/${s.code}`),
      group: "Saham",
    }));

    return [...baseActions, ...stockActions];
  }, [router, watchlistTickers]);

  // Filter by query
  const results = useMemo(() => {
    if (!query.trim()) {
      // Default: show nav + first 6 stocks + watchlist tickers
      const nav = allActions.filter((a) => a.group === "Navigasi" || a.group === "Aksi");
      const watchlist = watchlistMounted && watchlistTickers.length > 0
        ? allActions.filter(
            (a) => a.group === "Saham" && watchlistTickers.includes(a.label),
          )
        : [];
      const featured = allActions.filter((a) => a.group === "Saham").slice(0, 6);
      return [...nav, ...watchlist, ...featured];
    }

    const q = query.toLowerCase().trim();
    return allActions
      .filter((a) => {
        if (a.label.toLowerCase().includes(q)) return true;
        if (a.description?.toLowerCase().includes(q)) return true;
        if (a.keywords.some((k) => k.includes(q))) return true;
        return false;
      })
      .slice(0, 20);
  }, [query, allActions, watchlistMounted, watchlistTickers]);

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      // Open on "/" (only if not in input)
      if (e.key === "/" && !open) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea" && !target?.isContentEditable) {
          e.preventDefault();
          setOpen(true);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Listen for external open events (e.g. from KeyboardShortcuts button)
  useEffect(() => {
    function onShow(e: Event) {
      if ((e as CustomEvent).detail?.type === "command-palette") {
        setOpen(true);
      } else {
        setOpen(true);
      }
    }
    window.addEventListener("show-command-palette", onShow);
    return () => window.removeEventListener("show-command-palette", onShow);
  }, []);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Focus input after open
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset activeIndex when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(
      `[data-index="${activeIndex}"]`,
    );
    if (activeEl && "scrollIntoView" in activeEl) {
      (activeEl as HTMLElement).scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [activeIndex]);

  const handleSelect = useCallback(
    (action: PaletteAction) => {
      action.action();
      setOpen(false);
    },
    [],
  );

  const handleAddToWatchlist = useCallback(
    (code: string) => {
      addToWatchlist(code);
      setOpen(false);
    },
    [],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[activeIndex];
      if (item) handleSelect(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  if (!open) return null;

  // Group results
  const grouped = results.reduce(
    (acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    },
    {} as Record<string, PaletteAction[]>,
  );

  let globalIndex = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="w-full max-w-xl rounded-xl border bg-background shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 px-3 py-3 border-b">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari saham, navigasi, aksi..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto p-1.5"
        >
          {results.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              <p>Tidak ada hasil untuk "{query}"</p>
              <p className="text-[10px] mt-1">Coba kata kunci lain</p>
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-1 last:mb-0">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {group === "Saham" && watchlistMounted && watchlistTickers.length > 0 && !query
                    ? `${group} (Watchlist kamu + lainnya)`
                    : group}
                </div>
                {items.map((item) => {
                  const idx = globalIndex++;
                  const isActive = idx === activeIndex;
                  const isInWatchlist =
                    item.group === "Saham" &&
                    watchlistMounted &&
                    watchlistTickers.includes(item.label);
                  return (
                    <button
                      key={item.id}
                      data-index={idx}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={cn(
                        "w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-left text-sm",
                        isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent/60",
                      )}
                    >
                      <span
                        className={cn(
                          "shrink-0",
                          isActive ? "text-primary-foreground" : "text-muted-foreground",
                        )}
                      >
                        {item.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {isInWatchlist && (
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          )}
                        </div>
                        {item.description && (
                          <div
                            className={cn(
                              "text-[10px] truncate",
                              isActive
                                ? "text-primary-foreground/80"
                                : "text-muted-foreground",
                            )}
                          >
                            {item.description}
                          </div>
                        )}
                      </div>
                      {item.group === "Saham" &&
                        !isInWatchlist &&
                        watchlistMounted && (
                          <span
                            role="button"
                            tabIndex={-1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToWatchlist(item.label);
                            }}
                            className={cn(
                              "shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium",
                              isActive
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-accent",
                            )}
                          >
                            <Plus className="h-3 w-3" />
                            Wl
                          </span>
                        )}
                      {isActive && (
                        <ArrowRight
                          className={cn(
                            "h-3 w-3 shrink-0",
                            isActive ? "text-primary-foreground" : "text-muted-foreground",
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <kbd className="font-mono px-1 py-0.5 bg-background rounded border">
              ↑
            </kbd>
            <kbd className="font-mono px-1 py-0.5 bg-background rounded border">
              ↓
            </kbd>
            <span>navigasi</span>
            <kbd className="font-mono px-1 py-0.5 bg-background rounded border">
              ↵
            </kbd>
            <span>pilih</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="font-mono px-1 py-0.5 bg-background rounded border">
              {typeof navigator !== "undefined" && /Mac/i.test(navigator.platform)
                ? "⌘"
                : "Ctrl"}
            </kbd>
            <kbd className="font-mono px-1 py-0.5 bg-background rounded border">
              K
            </kbd>
            <span>buka</span>
          </div>
        </div>
      </div>
    </div>
  );
}
