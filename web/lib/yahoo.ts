import YahooFinance from "yahoo-finance2";
import type {
  ChartResultArray,
  Quote,
} from "yahoo-finance2/dist/esm/src/modules/chart";
import type { QuoteSummaryResult } from "yahoo-finance2/dist/esm/src/modules/quoteSummary";

const yahooFinance = new YahooFinance({
  // Suppress deprecation warnings in production
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

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
}

export interface StockInfo {
  // Valuation
  trailingPE?: number | null;
  forwardPE?: number | null;
  priceToBook?: number | null;
  priceToSalesTrailing12Months?: number | null;
  // Profitability
  returnOnEquity?: number | null;
  returnOnAssets?: number | null;
  profitMargins?: number | null;
  // Leverage
  debtToEquity?: number | null;
  currentRatio?: number | null;
  // Growth
  earningsGrowth?: number | null;
  earningsQuarterlyGrowth?: number | null;
  revenueGrowth?: number | null;
  revenueQuarterlyGrowth?: number | null;
  // Dividend
  dividendYield?: number | null;
  trailingAnnualDividendYield?: number | null;
  // Other
  sector?: string | null;
  industry?: string | null;
}

export function validateTicker(ticker: string): string {
  const t = ticker.toUpperCase().trim().replace(/\.JK$/, "");
  return `${t}.JK`;
}

/**
 * Fetch historical price data
 */
export async function fetchHistorical(
  ticker: string,
  period: "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" = "1y",
  interval: "1d" | "1wk" | "1mo" = "1d",
): Promise<StockPrice[]> {
  const fullTicker = validateTicker(ticker);

  try {
    const result: ChartResultArray = await yahooFinance.chart(fullTicker, {
      period1: getStartDate(period),
      period2: new Date(),
      interval,
    });

    if (!result || !result.quotes || result.quotes.length === 0) {
      throw new Error(`No historical data for ${fullTicker}`);
    }

    return result.quotes
      .filter(
        (q): q is Quote =>
          q !== null &&
          typeof q.close === "number" &&
          typeof q.open === "number" &&
          typeof q.high === "number" &&
          typeof q.low === "number" &&
          typeof q.volume === "number",
      )
      .map((q) => ({
        date: new Date(q.date).toISOString().split("T")[0],
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume,
      }));
  } catch (error) {
    throw new Error(
      `Failed to fetch ${fullTicker}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function getStartDate(period: string): Date {
  const now = new Date();
  const map: Record<string, number> = {
    "1mo": 30,
    "3mo": 90,
    "6mo": 180,
    "1y": 365,
    "2y": 730,
    "5y": 1825,
  };
  const days = map[period] || 365;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start;
}

/**
 * Fetch stock summary
 */
export async function fetchSummary(ticker: string): Promise<StockSummary> {
  const fullTicker = validateTicker(ticker);
  const code = fullTicker.replace(".JK", "");

  try {
    const quote: QuoteSummaryResult = await yahooFinance.quoteSummary(fullTicker, {
      modules: ["price", "summaryDetail", "defaultKeyStatistics"],
    });

    const price = quote.price;
    const detail = quote.summaryDetail;
    const stats = quote.defaultKeyStatistics;

    if (!price) {
      throw new Error(`No price data for ${fullTicker}`);
    }

    return {
      ticker: fullTicker,
      code,
      name: price.longName || price.shortName || code,
      sector: detail?.sector || price.sector || "N/A",
      currency: price.currency || "IDR",
      currentPrice:
        typeof price.regularMarketPrice === "number" ? price.regularMarketPrice : null,
      previousClose:
        typeof price.regularMarketPreviousClose === "number"
          ? price.regularMarketPreviousClose
          : null,
      dayHigh:
        typeof price.regularMarketDayHigh === "number" ? price.regularMarketDayHigh : null,
      dayLow:
        typeof price.regularMarketDayLow === "number" ? price.regularMarketDayLow : null,
      fiftyTwoWeekHigh:
        typeof detail?.fiftyTwoWeekHigh === "number" ? detail.fiftyTwoWeekHigh : null,
      fiftyTwoWeekLow:
        typeof detail?.fiftyTwoWeekLow === "number" ? detail.fiftyTwoWeekLow : null,
      fiftyDayAverage:
        typeof detail?.fiftyDayAverage === "number" ? detail.fiftyDayAverage : null,
      twoHundredDayAverage:
        typeof detail?.twoHundredDayAverage === "number" ? detail.twoHundredDayAverage : null,
      volume: typeof price.regularMarketVolume === "number" ? price.regularMarketVolume : null,
      averageVolume:
        typeof detail?.averageVolume === "number" ? detail.averageVolume : null,
      marketCap: typeof price.marketCap === "number" ? price.marketCap : null,
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch summary for ${fullTicker}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Fetch stock info (fundamental ratios)
 */
export async function fetchInfo(ticker: string): Promise<StockInfo> {
  const fullTicker = validateTicker(ticker);

  try {
    const quote = await yahooFinance.quoteSummary(fullTicker, {
      modules: ["defaultKeyStatistics", "summaryDetail", "financialData"],
    });

    const stats = quote.defaultKeyStatistics;
    const detail = quote.summaryDetail;
    const fin = quote.financialData;

    return {
      // Valuation
      trailingPE: typeof stats?.trailingPE?.raw === "number" ? stats.trailingPE.raw : null,
      forwardPE: typeof stats?.forwardPE?.raw === "number" ? stats.forwardPE.raw : null,
      priceToBook: typeof stats?.priceToBook?.raw === "number" ? stats.priceToBook.raw : null,
      priceToSalesTrailing12Months:
        typeof stats?.priceToSalesTrailing12Months?.raw === "number"
          ? stats.priceToSalesTrailing12Months.raw
          : null,
      // Profitability
      returnOnEquity: typeof fin?.returnOnEquity?.raw === "number" ? fin.returnOnEquity.raw : null,
      returnOnAssets: typeof fin?.returnOnAssets?.raw === "number" ? fin.returnOnAssets.raw : null,
      profitMargins: typeof fin?.profitMargins?.raw === "number" ? fin.profitMargins.raw : null,
      // Leverage
      debtToEquity: typeof fin?.debtToEquity?.raw === "number" ? fin.debtToEquity.raw : null,
      currentRatio: typeof fin?.currentRatio?.raw === "number" ? fin.currentRatio.raw : null,
      // Growth
      earningsGrowth:
        typeof fin?.earningsGrowth?.raw === "number" ? fin.earningsGrowth.raw : null,
      earningsQuarterlyGrowth:
        typeof stats?.earningsQuarterlyGrowth?.raw === "number"
          ? stats.earningsQuarterlyGrowth.raw
          : null,
      revenueGrowth: typeof fin?.revenueGrowth?.raw === "number" ? fin.revenueGrowth.raw : null,
      revenueQuarterlyGrowth:
        typeof stats?.revenueQuarterlyGrowth?.raw === "number"
          ? stats.revenueQuarterlyGrowth.raw
          : null,
      // Dividend
      dividendYield:
        typeof detail?.dividendYield?.raw === "number" ? detail.dividendYield.raw : null,
      trailingAnnualDividendYield:
        typeof detail?.trailingAnnualDividendYield?.raw === "number"
          ? detail.trailingAnnualDividendYield.raw
          : null,
      // Other
      sector: detail?.sector || null,
      industry: detail?.industry || null,
    };
  } catch (error) {
    console.error("fetchInfo error:", error);
    return {};
  }
}
