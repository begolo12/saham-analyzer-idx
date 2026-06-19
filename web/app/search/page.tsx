"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { POPULAR_STOCKS, SECTORS, type PopularStock } from "@/lib/popular-stocks";
import { cn } from "@/lib/utils";

interface SearchResult {
  ticker: string;
  code: string;
  name: string;
  sector: string;
  exchange: string;
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState<string | "All">("All");
  const [dynamicResults, setDynamicResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<"local" | "yahoo">("local");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced Yahoo search when user types 2+ chars
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setDynamicResults([]);
      setSearchMode("local");
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=30`);
        if (res.ok) {
          const data = await res.json();
          setDynamicResults(data.results || []);
          setSearchMode("yahoo");
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Local filter from static list (when no query or empty query)
  const localFiltered = useMemo(() => {
    let result = POPULAR_STOCKS;
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
  }, [query, selectedSector]);

  // Use dynamic results when searching
  const displayResults = searchMode === "yahoo" ? dynamicResults : [];
  const displaySectors = searchMode === "yahoo"
    ? Array.from(new Set(dynamicResults.map((r) => r.sector))).sort()
    : [];

  const filteredDynamic = useMemo(() => {
    if (selectedSector === "All") return dynamicResults;
    return dynamicResults.filter((r) => r.sector === selectedSector);
  }, [dynamicResults, selectedSector]);

  return (
    <div className="container py-4 sm:py-6 pb-24 md:pb-6">
      {/* Search Header */}
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2 mb-1">
          <Search className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          Cari Saham
        </h1>
        <p className="text-sm text-muted-foreground">
          900+ saham IDX tersedia via Yahoo Finance
        </p>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Ketik kode atau nama emiten..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-12 pr-12 h-12 text-base rounded-xl"
          autoFocus
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setSearchMode("local");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-accent"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Mode indicator */}
      {searchMode === "yahoo" && query.trim().length >= 2 && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <Badge variant="info" className="text-[10px]">
            <Sparkles className="h-3 w-3 mr-1" />
            Live search dari Yahoo Finance
          </Badge>
          {isSearching && <Loader2 className="h-3 w-3 animate-spin" />}
        </div>
      )}

      {/* Sector Filter */}
      <div className="mb-4 overflow-x-auto no-scrollbar -mx-4 px-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedSector("All")}
            className={cn(
              "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              selectedSector === "All"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-accent",
            )}
          >
            Semua ({searchMode === "yahoo" ? displayResults.length : POPULAR_STOCKS.length})
          </button>
          {(searchMode === "yahoo" ? displaySectors : SECTORS).map((sector) => {
            const count = searchMode === "yahoo"
              ? displayResults.filter((r) => r.sector === sector).length
              : POPULAR_STOCKS.filter((s) => s.sector === sector).length;
            return (
              <button
                key={sector}
                onClick={() => setSelectedSector(sector)}
                className={cn(
                  "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                  selectedSector === sector
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-accent",
                )}
              >
                {sector} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Results count */}
      <div className="text-xs text-muted-foreground mb-2 px-1">
        {searchMode === "yahoo"
          ? `${displayResults.length} hasil dari Yahoo Finance untuk "${query}"`
          : `${localFiltered.length} hasil dari daftar populer`}
      </div>

      {/* Local results (when no query) */}
      {searchMode === "local" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {localFiltered.map((stock) => (
              <StockResultCard
                key={stock.code}
                code={stock.code}
                name={stock.name}
                sector={stock.sector}
                onClick={() => router.push(`/stock/${stock.code}`)}
              />
            ))}
          </div>
          {localFiltered.length === 0 && (
            <EmptyState
              message="Tidak ada saham ditemukan di daftar populer"
              hint="Coba ketik minimal 2 karakter untuk live search dari Yahoo Finance"
            />
          )}
        </>
      )}

      {/* Yahoo search results */}
      {searchMode === "yahoo" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredDynamic.map((stock) => (
              <StockResultCard
                key={stock.code}
                code={stock.code}
                name={stock.name}
                sector={stock.sector}
                onClick={() => router.push(`/stock/${stock.code}`)}
              />
            ))}
          </div>
          {!isSearching && filteredDynamic.length === 0 && (
            <EmptyState
              message={`Tidak ada saham IDX ditemukan untuk "${query}"`}
              hint="Coba kata kunci lain. Yahoo Finance mungkin tidak punya data ticker ini."
            />
          )}
        </>
      )}
    </div>
  );
}

function StockResultCard({
  code,
  name,
  sector,
  onClick,
}: {
  code: string;
  name: string;
  sector: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border bg-card p-3 hover:bg-accent/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base">{code}</div>
          <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5 min-h-[2rem]">
            {name}
          </div>
        </div>
      </div>
      <Badge variant="secondary" className="mt-2 text-[10px]">
        {sector}
      </Badge>
    </button>
  );
}

function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="text-center py-12">
      <Search className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
      <p className="text-muted-foreground">{message}</p>
      {hint && (
        <p className="text-xs text-muted-foreground/70 mt-1">{hint}</p>
      )}
    </div>
  );
}
