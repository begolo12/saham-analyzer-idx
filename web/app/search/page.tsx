"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Loader2,
  Sparkles,
  Star,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowDownAZ,
  Flame,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { POPULAR_STOCKS, SECTORS, type PopularStock } from "@/lib/popular-stocks";
import { useWatchlist } from "@/lib/watchlist-storage";
import { cn, formatIDR, formatPercent } from "@/lib/utils";

interface SearchResult {
  ticker: string;
  code: string;
  name: string;
  sector: string;
  exchange: string;
}

interface StockLive {
  price: number | null;
  change: number | null;
  changePct: number | null;
}

const RECENT_KEY = "saham_search_recent";
const SORT_OPTIONS = [
  { id: "alpha", label: "A-Z", icon: ArrowDownAZ },
  { id: "gainers", label: "Top Gainers", icon: TrendingUp },
  { id: "losers", label: "Top Losers", icon: TrendingDown },
] as const;

type SortId = (typeof SORT_OPTIONS)[number]["id"];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState<string | "All">("All");
  const [sortBy, setSortBy] = useState<SortId>("alpha");
  const [showOnlyWatchlist, setShowOnlyWatchlist] = useState(false);
  const [dynamicResults, setDynamicResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<"local" | "yahoo">("local");
  const [livePrices, setLivePrices] = useState<Record<string, StockLive>>({});
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { tickers: watchlistTickers, mounted: watchlistMounted } = useWatchlist();

  // Load recent searches
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecentSearches(JSON.parse(raw).slice(0, 5));
    } catch {
      // ignore
    }
  }, []);

  const saveRecentSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) return;
    try {
      const next = [trimmed, ...recentSearches.filter((r) => r !== trimmed)].slice(0, 5);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      setRecentSearches(next);
    } catch {
      // ignore
    }
  }, [recentSearches]);

  // Debounced Yahoo search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setDynamicResults([]);
      setSearchMode("local");
      return;
    }

    setIsSearching(true);
    const abort = new AbortController();
    abortRef.current = abort;

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=30`,
          { signal: abort.signal },
        );
        if (res.ok) {
          const data = await res.json();
          setDynamicResults(data.results || []);
          setSearchMode("yahoo");
          saveRecentSearch(trimmed);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Search error:", err);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abort.abort();
    };
  }, [query, saveRecentSearch]);

  // Fetch live prices for visible stocks (batched, lazy)
  const localFiltered = useMemo(() => {
    // Dedupe by code (POPULAR_STOCKS may have duplicates with different sectors)
    const deduped = new Map<string, PopularStock>();
    for (const s of POPULAR_STOCKS) {
      if (!deduped.has(s.code)) deduped.set(s.code, s);
    }
    let result: PopularStock[] = Array.from(deduped.values());

    if (showOnlyWatchlist && watchlistMounted) {
      result = result.filter((s) => watchlistTickers.includes(s.code));
    }
    if (selectedSector !== "All") {
      result = result.filter((s) => s.sector === selectedSector);
    }
    if (query.trim()) {
      const q = query.toUpperCase().trim();
      result = result.filter(
        (s) =>
          s.code.toUpperCase().includes(q) ||
          s.name.toUpperCase().includes(q),
      );
    }
    return result;
  }, [query, selectedSector, showOnlyWatchlist, watchlistMounted, watchlistTickers]);

  // Sort local results
  const sortedLocal = useMemo(() => {
    if (sortBy === "alpha") {
      return [...localFiltered].sort((a, b) => a.code.localeCompare(b.code));
    }
    // For gainers/losers, sort by live price changePct
    const arr = [...localFiltered];
    arr.sort((a, b) => {
      const pa = livePrices[a.code]?.changePct ?? 0;
      const pb = livePrices[b.code]?.changePct ?? 0;
      return sortBy === "gainers" ? pb - pa : pa - pb;
    });
    return arr;
  }, [localFiltered, sortBy, livePrices]);

  // Yahoo results with sector filter
  const filteredDynamic = useMemo(() => {
    let result = dynamicResults;
    if (selectedSector !== "All") {
      result = result.filter((r) => r.sector === selectedSector);
    }
    if (showOnlyWatchlist && watchlistMounted) {
      result = result.filter((r) => watchlistTickers.includes(r.code));
    }
    return result;
  }, [dynamicResults, selectedSector, showOnlyWatchlist, watchlistMounted, watchlistTickers]);

  // Yahoo results sorted by live price
  const sortedDynamic = useMemo(() => {
    if (sortBy === "alpha") return filteredDynamic;
    const arr = [...filteredDynamic];
    arr.sort((a, b) => {
      const pa = livePrices[a.code]?.changePct ?? 0;
      const pb = livePrices[b.code]?.changePct ?? 0;
      return sortBy === "gainers" ? pb - pa : pa - pb;
    });
    return arr;
  }, [filteredDynamic, sortBy, livePrices]);

  const displaySectors = searchMode === "yahoo"
    ? Array.from(new Set(dynamicResults.map((r) => r.sector))).sort()
    : SECTORS;

  const totalCount = searchMode === "yahoo"
    ? filteredDynamic.length
    : sortedLocal.length;

  // Lazy-load live prices for visible stocks (batched)
  useEffect(() => {
    const codes = searchMode === "yahoo"
      ? filteredDynamic.map((r) => r.code)
      : sortedLocal.map((s) => s.code);

    const missing = codes.filter((c) => !(c in livePrices)).slice(0, 12);
    if (missing.length === 0) return;

    const ac = new AbortController();
    Promise.all(
      missing.map((code) =>
        fetch(`/api/quick/${code}`, { signal: ac.signal })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    ).then((results) => {
      if (ac.signal.aborted) return;
      const updates: Record<string, StockLive> = {};
      missing.forEach((code, i) => {
        const data = results[i];
        if (data) {
          updates[code] = {
            price: typeof data.price === "number" ? data.price : null,
            change: typeof data.change === "number" ? data.change : null,
            changePct:
              typeof data.changePct === "number" ? data.changePct : null,
          };
        }
      });
      if (Object.keys(updates).length > 0) {
        setLivePrices((prev) => ({ ...prev, ...updates }));
      }
    });

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchMode, sortedLocal.length, filteredDynamic.length]);

  // Top trending from popular stocks with positive change
  const trending = useMemo(() => {
    const deduped = new Map<string, PopularStock>();
    for (const s of POPULAR_STOCKS) {
      if (!deduped.has(s.code)) deduped.set(s.code, s);
    }
    return Array.from(deduped.values())
      .map((s) => ({ code: s.code, changePct: livePrices[s.code]?.changePct ?? 0 }))
      .filter((s) => s.changePct > 1)
      .sort((a, b) => b.changePct - a.changePct)
      .slice(0, 6);
  }, [livePrices]);

  const handleSelect = (code: string) => {
    router.push(`/stock/${code}`);
  };

  const handleClearFilters = () => {
    setSelectedSector("All");
    setSortBy("alpha");
    setShowOnlyWatchlist(false);
    setQuery("");
  };

  const hasActiveFilters =
    selectedSector !== "All" || sortBy !== "alpha" || showOnlyWatchlist || query.length > 0;

  return (
    <div className="container py-3 sm:py-4 pb-24 md:pb-6">
      {/* Slim Header */}
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-1.5">
            <Search className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Cari Saham
          </h1>
          <p className="text-xs text-muted-foreground">900+ saham IDX</p>
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-[10px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Ketik kode atau nama emiten..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-9 h-10 text-sm rounded-lg"
          autoFocus
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setSearchMode("local");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-accent"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Quick filter row: Watchlist + Sort */}
      <div className="mb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
        {/* Watchlist filter */}
        <button
          onClick={() => setShowOnlyWatchlist(!showOnlyWatchlist)}
          disabled={!watchlistMounted}
          className={cn(
            "shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
            showOnlyWatchlist
              ? "bg-amber-500 text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-accent",
          )}
        >
          <Star className={cn("h-3 w-3", showOnlyWatchlist && "fill-white")} />
          Watchlist
          {watchlistMounted && watchlistTickers.length > 0 && (
            <span className="opacity-80">({watchlistTickers.length})</span>
          )}
        </button>

        {/* Sort options */}
        <div className="shrink-0 flex items-center bg-muted rounded-full p-0.5">
          {SORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = sortBy === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSortBy(opt.id)}
                className={cn(
                  "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3 w-3" />
                {opt.label}
              </button>
            );
          })}
        </div>

        {searchMode === "yahoo" && (
          <div className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 text-[10px] font-medium">
            <Sparkles className="h-3 w-3" />
            Yahoo
          </div>
        )}
        {isSearching && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
      </div>

      {/* Trending ticker chips (if any trending) */}
      {trending.length > 0 && searchMode === "local" && !query && (
        <div className="mb-3 px-1">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            <Flame className="h-3 w-3 text-orange-500" />
            Trending
          </div>
          <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1">
            {trending.map((t) => (
              <button
                key={t.code}
                onClick={() => handleSelect(t.code)}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-xs font-medium tabular-nums"
              >
                <span>{t.code}</span>
                <span className="text-bull-600 font-bold text-[10px]">
                  +{t.changePct.toFixed(1)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sector Filter */}
      <div className="mb-3 overflow-x-auto no-scrollbar -mx-4 px-4">
        <div className="flex gap-1.5">
          <button
            onClick={() => setSelectedSector("All")}
            className={cn(
              "shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors",
              selectedSector === "All"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            Semua ({searchMode === "yahoo" ? dynamicResults.length : POPULAR_STOCKS.length})
          </button>
          {displaySectors.map((sector) => {
            const count = searchMode === "yahoo"
              ? dynamicResults.filter((r) => r.sector === sector).length
              : POPULAR_STOCKS.filter((s) => s.sector === sector).length;
            return (
              <button
                key={sector}
                onClick={() => setSelectedSector(sector)}
                className={cn(
                  "shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                  selectedSector === sector
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                {sector} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Results count */}
      <div className="text-[10px] text-muted-foreground mb-1.5 px-1 flex items-center justify-between">
        <span className="tabular-nums">
          {totalCount} {searchMode === "yahoo" ? `hasil Yahoo untuk "${query}"` : "saham"}
        </span>
        {searchMode === "yahoo" && (
          <span className="inline-flex items-center gap-0.5">
            <Sparkles className="h-2.5 w-2.5" /> live
          </span>
        )}
      </div>

      {/* Stock List - compact rows */}
      <div className="rounded-xl border bg-card overflow-hidden divide-y divide-border/40">
        {searchMode === "local" ? (
          sortedLocal.length === 0 ? (
            <EmptyState
              hasWatchlistFilter={showOnlyWatchlist}
              hasQuery={query.length > 0}
              watchlistEmpty={watchlistMounted && watchlistTickers.length === 0}
              recentSearches={recentSearches}
              onRecentClick={(q) => setQuery(q)}
            />
          ) : (
            sortedLocal.map((stock) => (
              <SearchRow
                key={stock.code}
                code={stock.code}
                name={stock.name}
                sector={stock.sector}
                live={livePrices[stock.code]}
                isInWatchlist={watchlistMounted && watchlistTickers.includes(stock.code)}
                onClick={() => handleSelect(stock.code)}
              />
            ))
          )
        ) : sortedDynamic.length === 0 && !isSearching ? (
          <EmptyState
            hasWatchlistFilter={showOnlyWatchlist}
            hasQuery={query.length > 0}
            watchlistEmpty={watchlistMounted && watchlistTickers.length === 0}
            recentSearches={recentSearches}
            onRecentClick={(q) => setQuery(q)}
          />
        ) : (
          sortedDynamic.map((stock) => (
            <SearchRow
              key={stock.code}
              code={stock.code}
              name={stock.name}
              sector={stock.sector}
              live={livePrices[stock.code]}
              isInWatchlist={watchlistMounted && watchlistTickers.includes(stock.code)}
              onClick={() => handleSelect(stock.code)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SearchRow({
  code,
  name,
  sector,
  live,
  isInWatchlist,
  onClick,
}: {
  code: string;
  name: string;
  sector: string;
  live?: StockLive;
  isInWatchlist?: boolean;
  onClick: () => void;
}) {
  const price = live?.price;
  const changePct = live?.changePct;
  const isUp = (changePct ?? 0) >= 0;
  const showChange = changePct !== null && changePct !== undefined;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/40 active:bg-accent transition-colors text-left"
    >
      {/* Ticker + name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm tabular-nums">{code}</span>
          {isInWatchlist && (
            <Star className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0" />
          )}
        </div>
        <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
          <span className="truncate">{name}</span>
          <span className="opacity-60 hidden sm:inline">· {sector}</span>
        </div>
      </div>

      {/* Price + change */}
      <div className="flex items-center gap-2 shrink-0 tabular-nums">
        {price !== null && price !== undefined ? (
          <span className="text-xs font-semibold">{formatIDR(price)}</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">…</span>
        )}
        {showChange && (
          <span
            className={cn(
              "text-[11px] font-bold min-w-12 text-right",
              isUp ? "text-bull-600" : "text-bear-600",
            )}
          >
            {isUp ? "+" : ""}
            {changePct.toFixed(2)}%
          </span>
        )}
      </div>
    </button>
  );
}

function EmptyState({
  hasWatchlistFilter,
  hasQuery,
  watchlistEmpty,
  recentSearches,
  onRecentClick,
}: {
  hasWatchlistFilter: boolean;
  hasQuery: boolean;
  watchlistEmpty: boolean;
  recentSearches: string[];
  onRecentClick: (q: string) => void;
}) {
  let message = "Tidak ada saham ditemukan";
  let hint: string | undefined;

  if (hasWatchlistFilter && watchlistEmpty) {
    message = "Watchlist kamu kosong";
    hint = "Buka halaman analisa saham untuk menambahkan ke watchlist (klik ⭐).";
  } else if (hasQuery) {
    message = "Coba kata kunci lain";
    hint = "Yahoo Finance mungkin tidak punya data ticker ini.";
  }

  return (
    <div className="px-4 py-8 text-center">
      <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {hint && <p className="text-[10px] text-muted-foreground/70 mt-1">{hint}</p>}

      {recentSearches.length > 0 && !hasQuery && (
        <div className="mt-4 text-left">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 justify-center">
            <Clock className="h-3 w-3" />
            Pencarian Terakhir
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {recentSearches.map((q) => (
              <button
                key={q}
                onClick={() => onRecentClick(q)}
                className="px-2.5 py-1 rounded-full bg-muted hover:bg-accent text-xs"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
