/**
 * Backtesting Engine
 *
 * Test strategi trading di data historis. Bandingkan return dengan IHSG.
 *
 * Strategi built-in:
 * - RSI Mean Reversion: beli RSI<30, jual RSI>70
 * - SMA Crossover: beli saat SMA20 > SMA50 (golden cross), jual saat death cross
 * - Buy & Hold: benchmark pasif
 *
 * Output: total return, win rate, max drawdown, vs IHSG comparison.
 */

import { fetchHistorical, fetchSummary, type StockPrice } from "@/lib/yahoo";

export type StrategyType =
  | "RSI_MEAN_REVERSION"
  | "SMA_CROSSOVER"
  | "BUY_HOLD";

export interface BacktestConfig {
  ticker: string;
  strategy: StrategyType;
  /** Periode backtest */
  period: "6mo" | "1y" | "2y";
  /** Modal awal (IDR) */
  initialCapital: number;
  /** RSI period (default 14) */
  rsiPeriod?: number;
  /** SMA fast period (default 20) */
  smaFast?: number;
  /** SMA slow period (default 50) */
  smaSlow?: number;
}

export interface Trade {
  date: string;
  action: "BUY" | "SELL";
  price: number;
  shares: number;
  value: number;
}

export interface BacktestResult {
  ticker: string;
  strategy: StrategyType;
  period: string;
  initialCapital: number;
  finalValue: number;
  totalReturn: number; // IDR
  totalReturnPct: number;
  buyHoldReturnPct: number;
  outperformance: number; // pct points vs buy & hold
  trades: Trade[];
  winRate: number;
  winCount: number;
  lossCount: number;
  maxDrawdown: number; // pct
  dataPoints: number;
}

/** Simple SMA */
function sma(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += values[j];
    }
    result.push(sum / period);
  }
  return result;
}

/** Simple RSI (Wilder's smoothing) */
function rsi(closes: number[], period = 14): number[] {
  const result: number[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      result.push(50); // neutral initial
      continue;
    }
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        result.push(100 - 100 / (1 + rs));
      } else {
        result.push(NaN);
      }
      continue;
    }

    // Wilder's smoothing
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }

  return result;
}

/** Strategy logic: returns array of BUY/SELL signals */
function generateSignals(
  closes: number[],
  config: BacktestConfig,
): Array<{ date: string; action: "BUY" | "SELL" | "HOLD"; price: number }> {
  const { strategy, rsiPeriod = 14, smaFast = 20, smaSlow = 50 } = config;
  const signals: Array<{ date: string; action: "BUY" | "SELL" | "HOLD"; price: number }> = [];
  const dates = closes.map((_, i) => `day-${i}`); // We don't have dates, but won't matter for logic

  if (strategy === "BUY_HOLD") {
    // Buy at day 0, sell at end
    signals.push({ date: dates[0], action: "BUY", price: closes[0] });
    signals.push({ date: dates[dates.length - 1], action: "SELL", price: closes[closes.length - 1] });
    return signals;
  }

  if (strategy === "RSI_MEAN_REVERSION") {
    const rsiValues = rsi(closes, rsiPeriod);
    let inPosition = false;
    for (let i = 1; i < closes.length; i++) {
      const r = rsiValues[i];
      if (Number.isNaN(r)) continue;
      if (!inPosition && r < 30) {
        signals.push({ date: dates[i], action: "BUY", price: closes[i] });
        inPosition = true;
      } else if (inPosition && r > 70) {
        signals.push({ date: dates[i], action: "SELL", price: closes[i] });
        inPosition = false;
      }
    }
    // Force close at end if still in position
    if (inPosition) {
      signals.push({
        date: dates[closes.length - 1],
        action: "SELL",
        price: closes[closes.length - 1],
      });
    }
    return signals;
  }

  if (strategy === "SMA_CROSSOVER") {
    const fast = sma(closes, smaFast);
    const slow = sma(closes, smaSlow);
    let inPosition = false;
    for (let i = 1; i < closes.length; i++) {
      if (Number.isNaN(fast[i]) || Number.isNaN(slow[i])) continue;
      if (!inPosition && fast[i] > slow[i] && fast[i - 1] <= slow[i - 1]) {
        // Golden cross
        signals.push({ date: dates[i], action: "BUY", price: closes[i] });
        inPosition = true;
      } else if (inPosition && fast[i] < slow[i] && fast[i - 1] >= slow[i - 1]) {
        // Death cross
        signals.push({ date: dates[i], action: "SELL", price: closes[i] });
        inPosition = false;
      }
    }
    if (inPosition) {
      signals.push({
        date: dates[closes.length - 1],
        action: "SELL",
        price: closes[closes.length - 1],
      });
    }
    return signals;
  }

  return signals;
}

/** Compute max drawdown from equity curve */
function maxDrawdown(equityCurve: number[]): number {
  let peak = equityCurve[0] ?? 0;
  let maxDD = 0;
  for (const v of equityCurve) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? ((peak - v) / peak) * 100 : 0;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

/** Run backtest for a single ticker */
export async function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  const data = await fetchHistorical(config.ticker, config.period, "1d");
  const closes = data.map((p) => p.close).filter((c) => typeof c === "number" && c > 0);
  if (closes.length < 30) {
    throw new Error(
      `Data historis tidak cukup untuk ${config.ticker} (perlu ≥30 hari, dapat ${closes.length})`,
    );
  }

  // Also fetch summary for current volume (used in Buy & Hold calc)
  let summary;
  try {
    summary = await fetchSummary(config.ticker);
  } catch {
    summary = null;
  }

  const signals = generateSignals(closes, config);

  // Execute trades
  let cash = config.initialCapital;
  let shares = 0;
  const trades: Trade[] = [];
  let winCount = 0;
  let lossCount = 0;
  const equityCurve: number[] = [];

  // Track per-trade P&L
  let lastBuyPrice = 0;

  for (const sig of signals) {
    if (sig.action === "BUY" && shares === 0) {
      // Buy as many whole lots (100 shares) as possible
      const maxShares = Math.floor(cash / sig.price);
      const buyShares = maxShares - (maxShares % 100); // round down to lot
      if (buyShares >= 100) {
        const cost = buyShares * sig.price;
        cash -= cost;
        shares = buyShares;
        lastBuyPrice = sig.price;
        trades.push({
          date: sig.date,
          action: "BUY",
          price: sig.price,
          shares: buyShares,
          value: cost,
        });
      }
    } else if (sig.action === "SELL" && shares > 0) {
      const proceeds = shares * sig.price;
      cash += proceeds;
      const tradeReturn = (sig.price - lastBuyPrice) * shares;
      if (tradeReturn > 0) winCount++;
      else if (tradeReturn < 0) lossCount++;
      trades.push({
        date: sig.date,
        action: "SELL",
        price: sig.price,
        shares,
        value: proceeds,
      });
      shares = 0;
    }
    equityCurve.push(cash + shares * sig.price);
  }

  // Final value (mark to last close if still holding)
  const finalPrice = closes[closes.length - 1];
  const finalValue = cash + shares * finalPrice;
  const totalReturn = finalValue - config.initialCapital;
  const totalReturnPct = (totalReturn / config.initialCapital) * 100;

  // Buy & hold comparison
  const buyHoldShares =
    Math.floor(config.initialCapital / closes[0]) -
    (Math.floor(config.initialCapital / closes[0]) % 100);
  const buyHoldFinal =
    buyHoldShares > 0 ? buyHoldShares * finalPrice : config.initialCapital;
  const buyHoldReturnPct =
    ((buyHoldFinal - config.initialCapital) / config.initialCapital) * 100;

  const totalSells = trades.filter((t) => t.action === "SELL").length;
  const winRate = totalSells > 0 ? (winCount / totalSells) * 100 : 0;
  const outperformance = totalReturnPct - buyHoldReturnPct;
  const mdd = maxDrawdown(equityCurve);

  return {
    ticker: config.ticker,
    strategy: config.strategy,
    period: config.period,
    initialCapital: config.initialCapital,
    finalValue: Math.round(finalValue),
    totalReturn: Math.round(totalReturn),
    totalReturnPct: Math.round(totalReturnPct * 100) / 100,
    buyHoldReturnPct: Math.round(buyHoldReturnPct * 100) / 100,
    outperformance: Math.round(outperformance * 100) / 100,
    trades,
    winRate: Math.round(winRate),
    winCount,
    lossCount,
    maxDrawdown: Math.round(mdd * 100) / 100,
    dataPoints: closes.length,
  };
}

export interface IHSGComparison {
  ihsgReturnPct: number;
  tickerOutperformance: number; // pct points vs IHSG
}

/** Compare with IHSG (^JKSE) for the same period */
export async function compareWithIHSG(
  period: BacktestConfig["period"],
): Promise<IHSGComparison> {
  try {
    const data = await fetchHistorical("^JKSE", period, "1d");
    const closes = data.map((p) => p.close).filter((c) => typeof c === "number" && c > 0);
    if (closes.length < 2) {
      return { ihsgReturnPct: 0, tickerOutperformance: 0 };
    }
    const start = closes[0];
    const end = closes[closes.length - 1];
    const ihsgReturnPct = ((end - start) / start) * 100;
    return { ihsgReturnPct, tickerOutperformance: 0 }; // will be set by caller
  } catch {
    return { ihsgReturnPct: 0, tickerOutperformance: 0 };
  }
}

export const STRATEGIES: { id: StrategyType; label: string; description: string }[] = [
  {
    id: "RSI_MEAN_REVERSION",
    label: "RSI Mean Reversion",
    description: "Beli saat RSI<30 (oversold), jual saat RSI>70 (overbought)",
  },
  {
    id: "SMA_CROSSOVER",
    label: "SMA Crossover (20/50)",
    description: "Beli saat SMA20 cross di atas SMA50 (golden cross), jual saat death cross",
  },
  {
    id: "BUY_HOLD",
    label: "Buy & Hold (Benchmark)",
    description: "Beli di awal periode, tahan sampai akhir. Sebagai pembanding pasif.",
  },
];

export const PERIODS: { id: BacktestConfig["period"]; label: string; days: number }[] = [
  { id: "6mo", label: "6 Bulan", days: 180 },
  { id: "1y", label: "1 Tahun", days: 365 },
  { id: "2y", label: "2 Tahun", days: 730 },
];
