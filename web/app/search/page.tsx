"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  AlertCircle,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
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

interface DisplayRow {
  code: string;
  name: string;
  sector: string;
}

const RECENT_KEY = "saham_search_recent";
const SORT_OPTIONS = [
  { id: "alpha", label: "A-Z", icon: ArrowDownAZ },
  { id: "gainers", label: "Top Gainers", icon: TrendingUp },
  { id: "losers", label: "Top Losers", icon: TrendingDown },
] as const;

type SortId = (typeof SORT_OPTIONS)[number]["id"];

function parseSort(value: string | null): SortId {
  return SORT_OPTIONS.some((opt) => opt.id === value) ? (value as SortId) : "alpha";
}

function buildSearchQueryString(
  query: string,
  sector: string,
  sortBy: SortId,
  showOnlyWatchlist: boolean,
) {
  const params = new URLSearchParams();
  const q = query.trim();
  if (q) params.set("q", q);
  if (sector !== "All") params.set("sector", sector);
  if (sortBy !== "alpha") params.set("sort", sortBy);
  if (showOnlyWatchlist) params.set("watchlist", "1");
  return params.toString();
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamString = searchParams.toString();

  const initialParams = useMemo(() => new URLSearchParams(searchParamString), [searchParamString]);
  const [query, setQuery] = useState(() => initialParams.get("q") || "");
  const [selectedSector, setSelectedSector] = useState<string | "All">(
    () => initialParams.get("sector") || "All",
  );
  const [sortBy, setSortBy] = useState<SortId>(() => parseSort(initialParams.get("sort")));
  const [showOnlyWatchlist, setShowOnlyWatchlist] = useState(
    () => initialParams.get("watchlist") === "1",
  );
  const [dynamicResults, setDynamicResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<"local" | "yahoo">("local");
  const [livePrices, setLivePrices] = useState<Record<string, StockLive>>({});
  const [unavailableCodes, setUnavailableCodes] = useState<Set<string>>(new Set());
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showSectors, setShowSectors] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const urlDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const applyingUrlRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const unavailableRef = useRef<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement | null>(null);
  const { tickers: watchlistTickers, mounted: watchlistMounted } = useWatchlist();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecentSearches(JSON.parse(raw).slice(0, 5));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchParamString);
    const nextQuery = params.get("q") || "";
    const nextSector = params.get("sector") || "All";
    const nextSort = parseSort(params.get("sort"));
    const nextWatchlist = params.get("watchlist") === "1";

    if (
      nextQuery !== query ||
      nextSector !== selectedSector ||
      nextSort !== sortBy ||
      nextWatchlist !== showOnlyWatchlist
    ) {
      applyingUrlRef.current = true;
      setQuery(nextQuery);
      setSelectedSector(nextSector);
      setSortBy(nextSort);
      setShowOnlyWatchlist(nextWatchlist);
    }
    // Sync from browser back/forward only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamString]);

  useEffect(() => {
    if (applyingUrlRef.current) {
      applyingUrlRef.current = false;
      return;
    }

    if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current);

    const params = new URLSearchParams(searchParamString);
    const current = buildSearchQueryString(
      params.get("q") || "",
      params.get("sector") || "All",
      parseSort(params.get("sort")),
      params.get("watchlist") === "1",
    );
    const next = buildSearchQueryString(query, selectedSector, sortBy, showOnlyWatchlist);
    if (current === next) return;

    urlDebounceRef.current = setTimeout(() => {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }, 180);

    return () => {
      if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current);
    };
  }, [pathname, query, router, searchParamString, selectedSector, showOnlyWatchlist, sortBy]);

  const saveRecentSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((r) => r !== trimmed)].slice(0, 5);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setDynamicResults([]);
      setSearchMode("local");
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    const abort = new AbortController();
    abortRef.current = abort;

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=30`,
          { signal: abort.signal },
        );
        if (!res.ok) throw new Error("Yahoo Finance belum merespons.");

        const data = await res.json();
        if (abort.signal.aborted) return;
        setDynamicResults(data.results || []);
        setSearchMode("yahoo");
        saveRecentSearch(trimmed);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Search error:", err);
          setSearchMode("local");
          setDynamicResults([]);
          setSearchError("Yahoo Finance belum tersedia. Menampilkan hasil lokal dulu.");
        }
      } finally {
        if (!abort.signal.aborted) setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abort.abort();
    };
  }, [query, saveRecentSearch]);

  const localFiltered = useMemo(() => {
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
          s.name.toUpperCase().includes(q) ||
          s.sector.toUpperCase().includes(q),
      );
    }
    return result;
  }, [query, selectedSector, showOnlyWatchlist, watchlistMounted, watchlistTickers]);

  const sortedLocal = useMemo(() => {
    if (sortBy === "alpha") {
      return [...localFiltered].sort((a, b) => a.code.localeCompare(b.code));
    }
    const arr = [...localFiltered];
    arr.sort((a, b) => {
      const pa = livePrices[a.code]?.changePct ?? 0;
      const pb = livePrices[b.code]?.changePct ?? 0;
      return sortBy === "gainers" ? pb - pa : pa - pb;
    });
    return arr;
  }, [localFiltered, sortBy, livePrices]);

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

  const displayRows: DisplayRow[] = useMemo(
    () => (searchMode === "yahoo" ? sortedDynamic : sortedLocal),
    [searchMode, sortedDynamic, sortedLocal],
  );

  const displaySectors = searchMode === "yahoo"
    ? Array.from(new Set(dynamicResults.map((r) => r.sector))).sort()
    : SECTORS;

  const visibleCodes = useMemo(
    () => displayRows.map((row) => row.code).slice(0, 24),
    [displayRows],
  );

  useEffect(() => {
    const missing = visibleCodes
      .filter((c) => !(c in livePrices) && !unavailableRef.current.has(c))
      .slice(0, 12);
    if (missing.length === 0) return;

    const ac = new AbortController();
    Promise.all(
      missing.map((code) =>
        fetch(`/api/quick/${code}`, { signal: ac.signal })
          .then((r) =>
            r.ok
              ? r.json().then((d) => ({ code, data: d, fail: false }))
              : { code, data: null, fail: true },
          )
          .catch(() => ({ code, data: null, fail: true })),
      ),
    ).then((results) => {
      if (ac.signal.aborted) return;
      const updates: Record<string, StockLive> = {};
      const failedCodes: string[] = [];
      results.forEach((r) => {
        if (r.fail || !r.data || typeof r.data.price !== "number") {
          failedCodes.push(r.code);
          return;
        }
        updates[r.code] = {
          price: r.data.price,
          change: typeof r.data.change === "number" ? r.data.change : null,
          changePct:
            typeof r.data.changePct === "number" ? r.data.changePct : null,
        };
      });
      if (Object.keys(updates).length > 0) {
        setLivePrices((prev) => ({ ...prev, ...updates }));
      }
      if (failedCodes.length > 0) {
        unavailableRef.current = new Set([
          ...unavailableRef.current,
          ...failedCodes,
        ]);
        setUnavailableCodes(new Set(unavailableRef.current));
      }
    });

    return () => ac.abort();
  }, [livePrices, visibleCodes]);

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

  useEffect(() => {
    setActiveIndex(displayRows.length > 0 ? 0 : -1);
  }, [displayRows.length, query, searchMode, selectedSector, showOnlyWatchlist, sortBy]);

  useEffect(() => {
    if (!listRef.current || activeIndex < 0) return;
    const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    if (activeEl && "scrollIntoView" in activeEl) {
      (activeEl as HTMLElement).scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeIndex]);

  const handleSelect = useCallback(
    (code: string) => {
      router.push(`/stock/${code}`);
    },
    [router],
  );

  const handleClearFilters = useCallback(() => {
    setSelectedSector("All");
    setSortBy("alpha");
    setShowOnlyWatchlist(false);
    setQuery("");
    setSearchMode("local");
    setSearchError(null);
    inputRef.current?.focus();
  }, []);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i < 0 ? 0 : i + 1, displayRows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i <= 0 ? 0 : i - 1, 0));
    } else if (e.key === "Enter") {
      const row = displayRows[activeIndex >= 0 ? activeIndex : 0];
      if (row) {
        e.preventDefault();
        handleSelect(row.code);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (query) {
        setQuery("");
        setSearchMode("local");
      } else {
        inputRef.current?.blur();
      }
    }
  };

  useEffect(() => {
    function onGlobalKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingTarget = tag === "input" || tag === "textarea" || target?.isContentEditable;

      if (e.key === "/" && !isTypingTarget) {
        e.preventDefault();
        e.stopImmediatePropagation();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }

      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        e.preventDefault();
        if (query) {
          setQuery("");
          setSearchMode("local");
        } else {
          inputRef.current?.blur();
        }
      }
    }

    window.addEventListener("keydown", onGlobalKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onGlobalKeyDown, { capture: true });
  }, [query]);

  const hasActiveFilters =
    selectedSector !== "All" || sortBy !== "alpha" || showOnlyWatchlist || query.length > 0;
  const activeFilterCount =
    (selectedSector !== "All" ? 1 : 0) +
    (sortBy !== "alpha" ? 1 : 0) +
    (showOnlyWatchlist ? 1 : 0);

  const resultSummary = isSearching
    ? "Mencari Yahoo Finance..."
    : searchMode === "yahoo"
      ? `${displayRows.length} hasil Yahoo untuk "${query}"`
      : query
        ? `${displayRows.length} hasil lokal untuk "${query}"`
        : `${displayRows.length} saham`;

  const currentSectorLabel = selectedSector === "All" ? "Semua sektor" : selectedSector;
  const currentSortLabel = SORT_OPTIONS.find((o) => o.id === sortBy)?.label || "A-Z";

  return (
    <div className="container page-main">
      <div className="sticky top-0 z-20 -mx-4 mb-3 bg-background/95 px-4 pt-3 pb-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pt-3 sm:pb-0 sm:backdrop-blur-0">
        {/* Compact title row */}
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-black tracking-tight">Cari Saham</h1>
            <span className="text-[11px] text-muted-foreground">900+ emiten IDX</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Reset
            </button>
          )}
        </div>

        {/* Hero search input */}
        <div className="relative mb-2.5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            type="search"
            placeholder="Cari emiten, contoh: BBCA"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="h-12 rounded-2xl pl-12 pr-12 text-base shadow-sm sm:h-11 sm:text-sm"
            autoFocus
            aria-label="Cari saham IDX"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery("");
                setSearchMode("local");
                setSearchError(null);
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-accent"
              aria-label="Bersihkan pencarian"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          ) : (
            <kbd
              aria-hidden
              className="absolute right-3 top-1/2 -translate-y-1/2 hidden items-center gap-0.5 rounded-md border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex"
            >
              <span className="text-sm leading-none">/</span>
            </kbd>
          )}
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground sm:hidden" />
          )}
        </div>

        {/* Compact filter toolbar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {/* Sector dropdown trigger */}
          <button
            onClick={() => setShowSectors((v) => !v)}
            aria-expanded={showSectors}
            aria-label={`Filter sektor, saat ini ${currentSectorLabel}`}
            className={cn(
              "min-h-9 shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              selectedSector !== "All"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            <SlidersHorizontal className="h-3 w-3" aria-hidden />
            {currentSectorLabel}
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                showSectors && "rotate-180",
              )}
            />
          </button>

          {/* Sort segmented */}
          <div className="min-h-9 shrink-0 flex items-center rounded-full bg-muted p-0.5">
            {SORT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = sortBy === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id)}
                  title={opt.label}
                  className={cn(
                    "inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Watchlist toggle */}
          <button
            onClick={() => setShowOnlyWatchlist(!showOnlyWatchlist)}
            disabled={!watchlistMounted}
            className={cn(
              "min-h-9 shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
              showOnlyWatchlist
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            <Star className={cn("h-3 w-3", showOnlyWatchlist && "fill-white")} />
            <span className="hidden sm:inline">Watchlist</span>
            {watchlistMounted && watchlistTickers.length > 0 && (
              <span className={cn("opacity-80", !showOnlyWatchlist && "sm:ml-0.5")}>
                {watchlistTickers.length}
              </span>
            )}
          </button>

          {searchMode === "yahoo" && (
            <div className="min-h-9 shrink-0 inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2.5 py-1.5 text-[10px] font-medium text-cyan-700 dark:text-cyan-400">
              <Sparkles className="h-3 w-3" />
              Yahoo
            </div>
          )}
        </div>

        {/* Active filter chips (only when applied) */}
        {(activeFilterCount > 0 || query) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setSearchMode("local");
                  setSearchError(null);
                  inputRef.current?.focus();
                }}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20"
              >
                <span className="max-w-[140px] truncate">“{query}”</span>
                <X className="h-3 w-3" />
              </button>
            )}
            {selectedSector !== "All" && (
              <button
                onClick={() => setSelectedSector("All")}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20"
              >
                {selectedSector}
                <X className="h-3 w-3" />
              </button>
            )}
            {sortBy !== "alpha" && (
              <button
                onClick={() => setSortBy("alpha")}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20"
              >
                Sort: {currentSortLabel}
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Collapsible sectors */}
        {showSectors && (
          <div className="mt-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 animate-fade-in">
            <div className="flex gap-1.5">
              {displaySectors.map((sector) => {
                const count = searchMode === "yahoo"
                  ? dynamicResults.filter((r) => r.sector === sector).length
                  : POPULAR_STOCKS.filter((s) => s.sector === sector).length;
                return (
                  <button
                    key={sector}
                    onClick={() => {
                      setSelectedSector(sector);
                      setShowSectors(false);
                    }}
                    className={cn(
                      "min-h-8 shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
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
        )}
      </div>

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
                aria-label={`${t.code} naik ${t.changePct.toFixed(1)} persen`}
                className="shrink-0 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold tabular-nums hover:bg-orange-500/20"
              >
                <Flame className="h-3 w-3 text-orange-500" aria-hidden />
                <span>{t.code}</span>
                <span className="text-bull-600 font-bold text-[11px]">
                  +{t.changePct.toFixed(1)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {searchError && (
        <div className="mb-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="text-[11px] text-muted-foreground mb-1.5 px-1 flex items-center justify-between"
      >
        <span className="tabular-nums font-medium">{resultSummary}</span>
        {searchMode === "yahoo" && !isSearching && (
          <span className="inline-flex items-center gap-0.5">
            <Sparkles className="h-2.5 w-2.5" aria-hidden />
            <span>live</span>
          </span>
        )}
      </div>

      <div ref={listRef} className="rounded-xl border bg-card overflow-hidden divide-y divide-border/40">
        {isSearching && query.trim().length >= 2 ? (
          <LoadingRows />
        ) : displayRows.length === 0 ? (
          <EmptyState
            hasWatchlistFilter={showOnlyWatchlist}
            hasQuery={query.length > 0}
            hasSectorFilter={selectedSector !== "All"}
            watchlistEmpty={watchlistMounted && watchlistTickers.length === 0}
            recentSearches={recentSearches}
            onRecentClick={(q) => {
              setQuery(q);
              inputRef.current?.focus();
            }}
            onResetFilters={handleClearFilters}
            onTryExample={() => {
              setSelectedSector("All");
              setQuery("BBCA");
              inputRef.current?.focus();
            }}
          />
        ) : (
          displayRows.map((stock, index) => (
            <SearchRow
              key={stock.code}
              index={index}
              code={stock.code}
              name={stock.name}
              sector={stock.sector}
              live={livePrices[stock.code]}
              isActive={index === activeIndex}
              isInWatchlist={watchlistMounted && watchlistTickers.includes(stock.code)}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => handleSelect(stock.code)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SearchRow({
  index,
  code,
  name,
  sector,
  live,
  isActive,
  isInWatchlist,
  onMouseEnter,
  onClick,
}: {
  index: number;
  code: string;
  name: string;
  sector: string;
  live?: StockLive;
  isActive?: boolean;
  isInWatchlist?: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  const price = live?.price;
  const changePct = live?.changePct;
  const isUp = (changePct ?? 0) >= 0;
  const showChange = changePct !== null && changePct !== undefined;

  return (
    <button
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={`Buka analisa ${code}, ${name}${showChange ? `, harga ${formatIDR(price)}, perubahan ${formatPercent(changePct)}` : ", harga tidak tersedia"}`}
      className={cn(
        "group w-full min-h-12 flex items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-accent",
        isActive ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : "hover:bg-accent/50",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[13px] tabular-nums tracking-tight">{code}</span>
          {isInWatchlist && (
            <Star className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0" aria-label="Di watchlist" />
          )}
        </div>
        <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
          <span className="truncate font-medium text-foreground/70">{name}</span>
          <span className="opacity-60 hidden sm:inline">· {sector}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 tabular-nums">
        {price !== null && price !== undefined ? (
          <span className="text-[13px] font-semibold tabular-nums">{formatIDR(price)}</span>
        ) : (
          <span
            className="text-[11px] text-muted-foreground/80 px-1.5 py-0.5 rounded bg-muted"
            title="Harga tidak tersedia dari Yahoo Finance"
          >
            N/A
          </span>
        )}
        {showChange && (
          <span
            className={cn(
              "text-[11px] font-bold tabular-nums min-w-14 text-right",
              isUp ? "text-bull-600" : "text-bear-600",
            )}
          >
            {formatPercent(changePct)}
          </span>
        )}
      </div>

      <ChevronRight
        className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground/50 transition-all",
          isActive
            ? "text-primary translate-x-0.5"
            : "group-hover:text-muted-foreground group-hover:translate-x-0.5",
        )}
        aria-hidden
      />
    </button>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-border/40" aria-label="Memuat hasil pencarian">
      <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Mencari di Yahoo Finance...
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex min-h-11 items-center gap-2 px-3 py-2 animate-pulse">
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-2.5 w-40 rounded bg-muted" />
          </div>
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-3 w-10 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  hasWatchlistFilter,
  hasQuery,
  hasSectorFilter,
  watchlistEmpty,
  recentSearches,
  onRecentClick,
  onResetFilters,
  onTryExample,
}: {
  hasWatchlistFilter: boolean;
  hasQuery: boolean;
  hasSectorFilter: boolean;
  watchlistEmpty: boolean;
  recentSearches: string[];
  onRecentClick: (q: string) => void;
  onResetFilters: () => void;
  onTryExample: () => void;
}) {
  let message = "Belum ada hasil";
  let hint = "Coba ketik kode saham atau nama emitennya.";

  if (hasWatchlistFilter && watchlistEmpty) {
    message = "Watchlist kamu kosong";
    hint = "Buka halaman analisa saham lalu klik ⭐ untuk menyimpan.";
  } else if (hasQuery && hasSectorFilter) {
    message = "Filter terlalu ketat";
    hint = "Coba reset sektor/filter atau pakai kata kunci lain.";
  } else if (hasQuery) {
    message = "Saham tidak ditemukan";
    hint = "Coba kode populer seperti BBCA, BBRI, TLKM, atau ASII.";
  } else if (hasSectorFilter || hasWatchlistFilter) {
    message = "Tidak ada saham di filter ini";
    hint = "Reset filter untuk melihat semua saham IDX.";
  }

  return (
    <div className="px-4 py-8 text-center">
      <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
      <p className="text-sm font-medium text-foreground">{message}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          onClick={onResetFilters}
          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Reset filter
        </button>
        <button
          onClick={onTryExample}
          className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold hover:bg-accent"
        >
          Coba BBCA
        </button>
      </div>

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
                className="rounded-full bg-muted px-2.5 py-1 text-xs hover:bg-accent"
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

function SearchPageSkeleton() {
  return (
    <div className="page-main container pt-3">
      <div className="mb-3 h-7 w-36 rounded bg-muted animate-pulse" />
      <div className="mb-2 h-12 rounded-2xl bg-muted animate-pulse" />
      <div className="mb-3 flex gap-2">
        <div className="h-9 w-24 rounded-full bg-muted animate-pulse" />
        <div className="h-9 w-32 rounded-full bg-muted animate-pulse" />
      </div>
      <LoadingRows />
    </div>
  );
}
