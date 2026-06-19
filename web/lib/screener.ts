/**
 * Stock Screener Module
 * Predefined screens for IDX stocks.
 *
 * Screens available:
 * 1. Volume Breakout - Volume > 2x avg + price up
 * 2. Oversold Bounce - RSI < 30
 * 3. Overbought - RSI > 70
 * 4. MACD Bullish Cross - MACD > signal + histogram positive
 * 5. Golden Cross - SMA50 > SMA200
 * 6. Strong Uptrend - price > SMA20 > SMA50
 * 7. Top Gainers - Today change > 3%
 * 8. Top Losers - Today change < -3%
 * 9. Near 52w High - Price within 5% of 52w high
 * 10. Near 52w Low - Price within 5% of 52w low
 */

import type { StockPrice } from "./yahoo";
import { SMA, RSI, MACD } from "technicalindicators";

export type ScreenerType =
  | "volume-breakout"
  | "oversold"
  | "overbought"
  | "macd-bullish"
  | "golden-cross"
  | "strong-uptrend"
  | "top-gainers"
  | "top-losers"
  | "near-52w-high"
  | "near-52w-low";

export interface ScreenerPreset {
  id: ScreenerType;
  name: string;
  description: string;
  icon: string; // emoji
  color: "bull" | "bear" | "neutral";
}

export const SCREENER_PRESETS: ScreenerPreset[] = [
  {
    id: "volume-breakout",
    name: "Volume Breakout",
    description: "Volume > 2x rata-rata + harga naik (akumulasi bandar)",
    icon: "🚀",
    color: "bull",
  },
  {
    id: "top-gainers",
    name: "Top Gainers",
    description: "Saham dengan kenaikan tertinggi hari ini (>3%)",
    icon: "📈",
    color: "bull",
  },
  {
    id: "top-losers",
    name: "Top Losers",
    description: "Saham dengan penurunan terdalam hari ini (<-3%)",
    icon: "📉",
    color: "bear",
  },
  {
    id: "oversold",
    name: "Oversold (RSI < 30)",
    description: "Saham yang sudah jatuh terlalu jauh, potensi rebound",
    icon: "⬇️",
    color: "bull",
  },
  {
    id: "overbought",
    name: "Overbought (RSI > 70)",
    description: "Saham yang sudah naik terlalu tinggi, waspadai koreksi",
    icon: "⬆️",
    color: "bear",
  },
  {
    id: "macd-bullish",
    name: "MACD Bullish Cross",
    description: "MACD crossing up signal line = momentum naik",
    icon: "✨",
    color: "bull",
  },
  {
    id: "golden-cross",
    name: "Golden Cross",
    description: "SMA50 memotong SMA50 ke atas = tren naik jangka panjang",
    icon: "🌟",
    color: "bull",
  },
  {
    id: "strong-uptrend",
    name: "Strong Uptrend",
    description: "Harga > SMA20 > SMA50 (tren naik kuat)",
    icon: "💪",
    color: "bull",
  },
  {
    id: "near-52w-high",
    name: "Dekat 52W High",
    description: "Saham di dekat level tertinggi 52 minggu",
    icon: "🏔️",
    color: "neutral",
  },
  {
    id: "near-52w-low",
    name: "Dekat 52W Low",
    description: "Saham di dekat level terendah 52 minggu (value opportunity)",
    icon: "🕳️",
    color: "bull",
  },
];

export interface ScreenerResult {
  ticker: string;
  code: string;
  name: string;
  sector: string;
  currentPrice: number;
  change: number;
  changePct: number;
  matchDetails: string;
  matchScore: number; // 0-100, higher = stronger match
}

/**
 * Run a screen against historical price data.
 * Returns true if stock matches criteria.
 */
export function matchesCriteria(
  type: ScreenerType,
  prices: StockPrice[],
): { matched: boolean; details: string; score: number } {
  if (prices.length < 30) return { matched: false, details: "", score: 0 };

  const closes = prices.map((p) => p.close);
  const volumes = prices.map((p) => p.volume);
  const last = closes[closes.length - 1];
  const prev = closes[closes.length - 2];

  switch (type) {
    case "volume-breakout": {
      // Volume today > 2x average last 20 days, AND price up
      const last20 = volumes.slice(-21, -1);
      const avgVolume = last20.reduce((a, b) => a + b, 0) / last20.length;
      const todayVolume = volumes[volumes.length - 1];
      const priceChange = last - prev;
      const priceChangePct = (priceChange / prev) * 100;

      if (todayVolume > avgVolume * 2 && priceChangePct > 1) {
        const ratio = todayVolume / avgVolume;
        const score = Math.min(100, (ratio - 2) * 20 + priceChangePct * 5);
        return {
          matched: true,
          details: `Volume ${ratio.toFixed(1)}x avg, +${priceChangePct.toFixed(2)}%`,
          score,
        };
      }
      return { matched: false, details: "", score: 0 };
    }

    case "oversold": {
      const rsiValues = RSI.calculate({ values: closes, period: 14 });
      const rsi = rsiValues[rsiValues.length - 1];
      if (rsi !== undefined && rsi < 30) {
        return {
          matched: true,
          details: `RSI ${rsi.toFixed(1)}`,
          score: Math.max(0, (30 - rsi) * 3),
        };
      }
      return { matched: false, details: "", score: 0 };
    }

    case "overbought": {
      const rsiValues = RSI.calculate({ values: closes, period: 14 });
      const rsi = rsiValues[rsiValues.length - 1];
      if (rsi !== undefined && rsi > 70) {
        return {
          matched: true,
          details: `RSI ${rsi.toFixed(1)}`,
          score: Math.min(100, (rsi - 70) * 3),
        };
      }
      return { matched: false, details: "", score: 0 };
    }

    case "macd-bullish": {
      const macdData = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
      });
      if (macdData.length < 2) return { matched: false, details: "", score: 0 };
      const current = macdData[macdData.length - 1];
      const prev = macdData[macdData.length - 2];
      if (!current || !prev) return { matched: false, details: "", score: 0 };

      const { MACD: macd, signal, histogram } = current;
      if (
        macd !== undefined &&
        signal !== undefined &&
        histogram !== undefined &&
        macd > signal &&
        histogram > 0
      ) {
        return {
          matched: true,
          details: `MACD bullish, hist ${histogram.toFixed(2)}`,
          score: Math.min(100, histogram * 50),
        };
      }
      return { matched: false, details: "", score: 0 };
    }

    case "golden-cross": {
      if (closes.length < 200)
        return { matched: false, details: "", score: 0 };
      const sma50 = SMA.calculate({ values: closes, period: 50 });
      const sma200 = SMA.calculate({ values: closes, period: 200 });
      const sma50Last = sma50[sma50.length - 1];
      const sma200Last = sma200[sma200.length - 1];
      if (sma50Last === undefined || sma200Last === undefined)
        return { matched: false, details: "", score: 0 };
      if (sma50Last > sma200Last) {
        const diff = ((sma50Last - sma200Last) / sma200Last) * 100;
        return {
          matched: true,
          details: `SMA50 > SMA200 (+${diff.toFixed(2)}%)`,
          score: Math.min(100, diff * 20),
        };
      }
      return { matched: false, details: "", score: 0 };
    }

    case "strong-uptrend": {
      if (closes.length < 50)
        return { matched: false, details: "", score: 0 };
      const sma20 = SMA.calculate({ values: closes, period: 20 });
      const sma50 = SMA.calculate({ values: closes, period: 50 });
      const sma20Last = sma20[sma20.length - 1];
      const sma50Last = sma50[sma50.length - 1];
      if (sma20Last === undefined || sma50Last === undefined)
        return { matched: false, details: "", score: 0 };
      if (last > sma20Last && sma20Last > sma50Last) {
        const margin = ((last - sma50Last) / sma50Last) * 100;
        return {
          matched: true,
          details: `Above SMA20 & SMA50 (+${margin.toFixed(2)}%)`,
          score: Math.min(100, margin * 5),
        };
      }
      return { matched: false, details: "", score: 0 };
    }

    case "top-gainers": {
      const changePct = ((last - prev) / prev) * 100;
      if (changePct >= 3) {
        return {
          matched: true,
          details: `+${changePct.toFixed(2)}% hari ini`,
          score: Math.min(100, changePct * 10),
        };
      }
      return { matched: false, details: "", score: 0 };
    }

    case "top-losers": {
      const changePct = ((last - prev) / prev) * 100;
      if (changePct <= -3) {
        return {
          matched: true,
          details: `${changePct.toFixed(2)}% hari ini`,
          score: Math.min(100, Math.abs(changePct) * 10),
        };
      }
      return { matched: false, details: "", score: 0 };
    }

    case "near-52w-high": {
      if (closes.length < 252)
        return { matched: false, details: "", score: 0 };
      const yearHigh = Math.max(...closes.slice(-252));
      const distance = ((yearHigh - last) / yearHigh) * 100;
      if (distance <= 5 && distance >= 0) {
        return {
          matched: true,
          details: `${distance.toFixed(1)}% dari 52w high`,
          score: 100 - distance * 10,
        };
      }
      return { matched: false, details: "", score: 0 };
    }

    case "near-52w-low": {
      if (closes.length < 252)
        return { matched: false, details: "", score: 0 };
      const yearLow = Math.min(...closes.slice(-252));
      const distance = ((last - yearLow) / yearLow) * 100;
      if (distance <= 5 && distance >= 0) {
        return {
          matched: true,
          details: `${distance.toFixed(1)}% dari 52w low`,
          score: 100 - distance * 10,
        };
      }
      return { matched: false, details: "", score: 0 };
    }

    default:
      return { matched: false, details: "", score: 0 };
  }
}

/**
 * Quick price-based screens that don't need historical data.
 * Used for /api/market/overview based screens.
 */
export interface QuickQuote {
  ticker: string;
  code: string;
  price: number;
  previousClose: number | null;
  change: number;
  changePct: number;
}

export function quickScreenTopGainers(
  quotes: QuickQuote[],
  minPct = 3,
): QuickQuote[] {
  return quotes
    .filter((q) => q.changePct >= minPct)
    .sort((a, b) => b.changePct - a.changePct);
}

export function quickScreenTopLosers(
  quotes: QuickQuote[],
  maxPct = -3,
): QuickQuote[] {
  return quotes
    .filter((q) => q.changePct <= maxPct)
    .sort((a, b) => a.changePct - b.changePct);
}
