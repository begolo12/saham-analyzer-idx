/**
 * Real-time IDX data via TradingView scanner.
 *
 * TradingView scanner provides real-time data for IDX stocks via POST endpoint,
 * no authentication required. This is fresher than yfinance (which can be 15-30 min delayed).
 *
 * Columns reference (index → field):
 *   0: close
 *   1: volume
 *   2: change (%)
 *   3: change_abs
 *   4: high
 *   5: low
 *   6: open
 *   7: prev_close
 *   8: volume_24h
 *   9: value_idr
 *   10: market_cap
 *   11: currency
 *   12: sector
 *   13: industry
 *   14: country
 *   15: update_mode
 *   16: type
 *   17: description
 */

export interface RealtimeQuote {
  ticker: string;          // BBCA (tanpa suffix)
  symbol: string;          // IDX:BBCA
  price: number;
  prevClose: number;
  changeAbs: number;
  changePct: number;       // dalam % (sudah langsung, e.g. 3.7 untuk 3.7%)
  open: number;
  high: number;
  low: number;
  volume: number;
  valueIdr: number;
  marketCap: number | null;
  sector: string;
  industry: string;
  description: string;
  fetchedAt: string;       // ISO timestamp
  source: "tradingview";
}

const TV_COLUMNS = [
  "close",
  "volume",
  "change",
  "change_abs",
  "high",
  "low",
  "open",
  "prev_close",
  "volume_24h",
  "Value.Traded",
  "market_cap_basic",
  "fundamental_currency_code",
  "sector",
  "industry",
  "country",
  "update_mode",
  "type",
  "description",
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Fetch real-time quotes untuk banyak ticker via TradingView scanner.
 * Returns Map ticker → RealtimeQuote.
 */
export async function fetchRealtimeQuotes(
  tickers: string[],
): Promise<Map<string, RealtimeQuote>> {
  if (tickers.length === 0) return new Map();

  // Normalize ke format TV: IDX:XXXX
  const tvSymbols = tickers.map((t) => `IDX:${t.toUpperCase().replace(".JK", "").trim()}`);
  const symbolToTicker = new Map<string, string>();
  for (const t of tickers) {
    const base = t.toUpperCase().replace(".JK", "").trim();
    symbolToTicker.set(`IDX:${base}`, base);
  }

  const url = "https://scanner.tradingview.com/indonesia/scan";
  const body = JSON.stringify({
    symbols: { tickers: tvSymbols },
    columns: TV_COLUMNS,
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
      },
      body,
      signal: controller.signal,
      next: { revalidate: 300 }, // 5 min cache
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`TradingView scanner returned ${res.status}`);
    }

    const data = await res.json();
    const rows = data?.data ?? [];
    const fetchedAt = new Date().toISOString();
    const result = new Map<string, RealtimeQuote>();

    for (const row of rows) {
      const sym = row.s as string;
      const values = row.d as any[];
      const base = symbolToTicker.get(sym);
      if (!base || !Array.isArray(values)) continue;

      const get = (idx: number) => values[idx];

      const price = Number(get(0)) || 0;
      if (price <= 0) continue;

      const changeAbs = Number(get(3)) || 0;
      // TV returns prev_close as null in many cases → compute from price - change
      const prevCloseRaw = get(7);
      const prevClose =
        typeof prevCloseRaw === "number" && prevCloseRaw > 0
          ? prevCloseRaw
          : price - changeAbs;

      result.set(base, {
        ticker: base,
        symbol: sym,
        price,
        prevClose,
        changeAbs,
        changePct: Number(get(2)) || 0, // TV sudah dalam % (bukan decimal)
        open: Number(get(6)) || price,
        high: Number(get(4)) || price,
        low: Number(get(5)) || price,
        volume: Number(get(1)) || 0,
        valueIdr: Number(get(9)) || 0,
        marketCap: get(10) != null ? Number(get(10)) : null,
        sector: String(get(12) ?? "Unknown"),
        industry: String(get(13) ?? "Unknown"),
        description: String(get(17) ?? base),
        fetchedAt,
        source: "tradingview",
      });
    }

    return result;
  } catch (err) {
    console.warn("[realtime] fetch failed:", err);
    return new Map();
  }
}

/**
 * Get single ticker real-time quote.
 */
export async function getRealtimeQuote(ticker: string): Promise<RealtimeQuote | null> {
  const quotes = await fetchRealtimeQuotes([ticker]);
  const base = ticker.toUpperCase().replace(".JK", "").trim();
  return quotes.get(base) ?? null;
}

/**
 * Format ISO timestamp → human-readable freshness string.
 */
export function formatFreshness(isoTs: string, locale: "id" | "en" = "id"): string {
  try {
    const ts = new Date(isoTs).getTime();
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 0) return locale === "id" ? "baru" : "just now";
    if (seconds < 60) return locale === "id" ? `${seconds} detik lalu` : `${seconds}s ago`;
    if (seconds < 3600)
      return locale === "id" ? `${Math.floor(seconds / 60)} menit lalu` : `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400)
      return locale === "id" ? `${Math.floor(seconds / 3600)} jam lalu` : `${Math.floor(seconds / 3600)}h ago`;
    return locale === "id" ? `${Math.floor(seconds / 86400)} hari lalu` : `${Math.floor(seconds / 86400)}d ago`;
  } catch {
    return locale === "id" ? "waktu tidak diketahui" : "unknown";
  }
}
