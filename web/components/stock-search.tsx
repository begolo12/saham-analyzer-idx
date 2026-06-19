"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { POPULAR_STOCKS } from "@/lib/popular-stocks";

export function StockSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return POPULAR_STOCKS.slice(0, 8);
    const q = query.toUpperCase();
    return POPULAR_STOCKS.filter(
      (s) =>
        s.code.toUpperCase().includes(q) ||
        s.name.toUpperCase().includes(q) ||
        s.sector.toUpperCase().includes(q),
    ).slice(0, 8);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ticker = query.trim().toUpperCase().replace(".JK", "");
    if (ticker) {
      router.push(`/stock/${ticker}`);
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Cari saham IDX... (contoh: BBCA)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-11 h-12 text-base rounded-xl shadow-sm"
          />
        </div>
        <Button type="submit" size="lg" className="h-12 px-6 rounded-xl">
          Analisa
        </Button>
      </form>

      {query.trim() && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border bg-popover shadow-xl z-30 overflow-hidden animate-fade-in">
          {filtered.map((stock) => (
            <button
              key={stock.code}
              type="button"
              onClick={() => router.push(`/stock/${stock.code}`)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors text-left border-b last:border-0"
            >
              <div>
                <div className="font-semibold text-sm">{stock.code}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {stock.name}
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                {stock.sector}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
