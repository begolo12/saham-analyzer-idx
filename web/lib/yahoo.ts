/**
 * Yahoo Finance Wrapper - Direct HTTP Fetch
 * Mengambil data saham IDX langsung dari Yahoo Finance HTTP endpoints.
 *
 * Lebih reliable dari yahoo-finance2 library karena tidak ada dependency issues.
 */

export interface StockPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockSummary {
  ticker: string;
  code: string;
  name: string;
  sector: string;
  currency: string;
  currentPrice: number | null;
  previousClose: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyDayAverage: number | null;
  twoHundredDayAverage: number | null;
  volume: number | null;
  averageVolume: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  priceToSalesTrailing12Months: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  profitMargins: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  earningsGrowth: number | null;
  earningsQuarterlyGrowth: number | null;
  revenueGrowth: number | null;
  revenueQuarterlyGrowth: number | null;
  dividendYield: number | null;
  trailingAnnualDividendYield: number | null;
}

export function validateTicker(ticker: string): string {
  const t = ticker.toUpperCase().trim();
  if (t.startsWith("^")) return t;
  const base = t.replace(/\.JK$/, "");
  return `${base}.JK`;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        currency?: string;
        symbol: string;
        regularMarketPrice?: number;
        previousClose?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketVolume?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
        fiftyDayAverage?: number;
        twoHundredDayAverage?: number;
        longName?: string;
        shortName?: string;
      };
      timestamp?: number[];
      indicators: {
        quote: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
    error: any;
  };
}

/**
 * Fetch historical price + summary in one call
 */
async function fetchChart(
  ticker: string,
  period: string = "1y",
  interval: string = "1d",
): Promise<YahooChartResponse> {
  const fullTicker = validateTicker(ticker);

  // Period to Unix timestamp
  const now = Math.floor(Date.now() / 1000);
  const periodMap: Record<string, number> = {
    "1mo": 30 * 24 * 60 * 60,
    "3mo": 90 * 24 * 60 * 60,
    "6mo": 180 * 24 * 60 * 60,
    "1y": 365 * 24 * 60 * 60,
    "2y": 730 * 24 * 60 * 60,
    "5y": 1825 * 24 * 60 * 60,
  };
  const period1 = now - (periodMap[period] || periodMap["1y"]);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(fullTicker)}?period1=${period1}&period2=${now}&interval=${interval}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      // Cache for 5 minutes
      next: { revalidate: 300 },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Yahoo Finance returned ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/**
 * Fetch historical price data
 */
export async function fetchHistorical(
  ticker: string,
  period: "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" = "1y",
  interval: "1d" | "1wk" | "1mo" = "1d",
): Promise<StockPrice[]> {
  const data = await fetchChart(ticker, period, interval);

  if (data.chart.error) {
    throw new Error(
      typeof data.chart.error === "string"
        ? data.chart.error
        : data.chart.error.description || "Yahoo Finance error",
    );
  }

  const result = data.chart.result?.[0];
  if (!result) {
    throw new Error(`No data returned for ${ticker}`);
  }

  const timestamps = result.timestamp || [];
  const quote = result.indicators.quote[0];
  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];
  const volumes = quote.volume || [];

  const prices: StockPrice[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const open = opens[i];
    const close = closes[i];
    const high = highs[i];
    const low = lows[i];
    const volume = volumes[i];

    if (
      typeof open !== "number" ||
      typeof close !== "number" ||
      typeof high !== "number" ||
      typeof low !== "number" ||
      typeof volume !== "number"
    ) {
      continue;
    }

    prices.push({
      date: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
      open,
      high,
      low,
      close,
      volume,
    });
  }

  if (prices.length === 0) {
    throw new Error(`No valid price data for ${ticker}`);
  }

  return prices;
}

/**
 * Fetch stock summary (price + fundamentals)
 */
export async function fetchSummary(ticker: string): Promise<StockSummary> {
  const fullTicker = validateTicker(ticker);
  const code = fullTicker.replace(".JK", "");

  const data = await fetchChart(code, "1y", "1d");

  if (data.chart.error) {
    throw new Error(
      typeof data.chart.error === "string"
        ? data.chart.error
        : data.chart.error.description || "Yahoo Finance error",
    );
  }

  const result = data.chart.result?.[0];
  if (!result) {
    throw new Error(`No data returned for ${code}`);
  }

  const meta = result.meta;
  const lastClose =
    result.indicators.quote[0].close?.filter((c): c is number => typeof c === "number").pop() ??
    null;
  const prevClose = meta.previousClose ?? null;
  const currency = meta.currency || "IDR";
  const name = meta.longName || meta.shortName || code;

  return {
    ticker: fullTicker,
    code,
    name,
    sector: "N/A", // Sector dari chart endpoint tidak tersedia; pakai stat module
    currency,
    currentPrice: meta.regularMarketPrice ?? lastClose,
    previousClose: prevClose,
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
    fiftyDayAverage: meta.fiftyDayAverage ?? null,
    twoHundredDayAverage: meta.twoHundredDayAverage ?? null,
    volume: meta.regularMarketVolume ?? null,
    averageVolume: null,
    marketCap: null,
    trailingPE: null,
    forwardPE: null,
    priceToBook: null,
    priceToSalesTrailing12Months: null,
    returnOnEquity: null,
    returnOnAssets: null,
    profitMargins: null,
    debtToEquity: null,
    currentRatio: null,
    earningsGrowth: null,
    earningsQuarterlyGrowth: null,
    revenueGrowth: null,
    revenueQuarterlyGrowth: null,
    dividendYield: null,
    trailingAnnualDividendYield: null,
  };
}

/**
 * Fetch fundamental data via quoteSummary endpoint
 * Returns nulls for fields that aren't available (graceful degradation)
 */
export async function fetchInfo(ticker: string): Promise<Partial<StockSummary>> {
  const fullTicker = validateTicker(ticker);
  const modules = ["defaultKeyStatistics", "summaryDetail", "financialData"];
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(fullTicker)}?modules=${modules.join(",")}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      next: { revalidate: 3600 }, // 1 hour cache (fundamentals don't change often)
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`quoteSummary returned ${res.status} for ${ticker}`);
      return {};
    }

    const data = await res.json();
    const result = data.quoteSummary?.result?.[0];
    if (!result) return {};

    const stats = result.defaultKeyStatistics || {};
    const detail = result.summaryDetail || {};
    const fin = result.financialData || {};

    const numVal = (o: any): number | null =>
      typeof o?.raw === "number" ? o.raw : null;

    return {
      sector: detail.sector || null,
      averageVolume: numVal(detail.averageVolume),
      marketCap: numVal(detail.marketCap) ?? numVal(detail["marketCap"]),
      trailingPE: numVal(stats.trailingPE),
      forwardPE: numVal(stats.forwardPE),
      priceToBook: numVal(stats.priceToBook),
      priceToSalesTrailing12Months: numVal(stats.priceToSalesTrailing12Months),
      returnOnEquity: numVal(fin.returnOnEquity),
      returnOnAssets: numVal(fin.returnOnAssets),
      profitMargins: numVal(fin.profitMargins),
      debtToEquity: numVal(fin.debtToEquity),
      currentRatio: numVal(fin.currentRatio),
      earningsGrowth: numVal(fin.earningsGrowth),
      earningsQuarterlyGrowth: numVal(stats.earningsQuarterlyGrowth),
      revenueGrowth: numVal(fin.revenueGrowth),
      revenueQuarterlyGrowth: numVal(stats.revenueQuarterlyGrowth),
      dividendYield: numVal(detail.dividendYield),
      trailingAnnualDividendYield: numVal(detail.trailingAnnualDividendYield),
    };
  } catch (err) {
    console.warn(`fetchInfo error for ${ticker}:`, err);
    return {};
  }
}
