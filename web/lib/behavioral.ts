/**
 * Behavioral Patterns Analysis
 * Mendeteksi "kebiasaan" atau pola perilaku saham.
 */

import type { StockPrice } from "./yahoo";
import { SMA } from "technicalindicators";

export type BehavioralSignal =
  | "STRONG_BULLISH"
  | "BULLISH"
  | "NEUTRAL"
  | "BEARISH"
  | "STRONG_BEARISH";

export const BEHAVIORAL_INDONESIAN: Record<BehavioralSignal, string> = {
  STRONG_BULLISH: "Sangat Bullish",
  BULLISH: "Bullish",
  NEUTRAL: "Netral",
  BEARISH: "Bearish",
  STRONG_BEARISH: "Sangat Bearish",
};

export const BEHAVIORAL_SCORE: Record<BehavioralSignal, number> = {
  STRONG_BULLISH: 2,
  BULLISH: 1,
  NEUTRAL: 0,
  BEARISH: -1,
  STRONG_BEARISH: -2,
};

export interface BehavioralPattern {
  name: string;
  pattern: string;
  signal: BehavioralSignal;
  score: number;
  description: string;
  implication: string;
}

export interface BehavioralAnalysisResult {
  patterns: BehavioralPattern[];
  overallScore: number;
  overallSignal: BehavioralSignal;
  supportLevels: number[];
  resistanceLevels: number[];
  summary: string;
}

/**
 * Volume Behavior - akumulasi/distribusi detection
 */
function analyzeVolumeBehavior(prices: StockPrice[]): BehavioralPattern {
  if (prices.length < 5) {
    return {
      name: "Volume Behavior",
      pattern: "Insufficient Data",
      signal: "NEUTRAL",
      score: 0,
      description: "Data tidak cukup",
      implication: "Butuh minimal 5 hari",
    };
  }

  const recent = prices.slice(-20);
  const priceChanges = recent.map((p, i) =>
    i === 0 ? 0 : p.close - recent[i - 1].close,
  );

  const upDays = recent.filter((p, i) => i > 0 && priceChanges[i] > 0);
  const downDays = recent.filter((p, i) => i > 0 && priceChanges[i] < 0);

  const volUp =
    upDays.length > 0 ? upDays.reduce((sum, p) => sum + p.volume, 0) / upDays.length : 0;
  const volDown =
    downDays.length > 0 ? downDays.reduce((sum, p) => sum + p.volume, 0) / downDays.length : 0;

  const priceChange5d =
    prices[prices.length - 1].close - prices[prices.length - Math.min(5, prices.length)].close;

  let pattern: string, signal: BehavioralSignal, score: number, desc: string, impl: string;

  if (volUp > volDown * 1.3 && priceChange5d > 0) {
    pattern = "Akumulasi";
    signal = "BULLISH";
    score = 1.5;
    desc = `Volume hari naik (${volUp.toFixed(0)}) > hari turun (${volDown.toFixed(0)}). Harga naik dalam 5 hari terakhir.`;
    impl = "Smart money sedang akumulasi — potensi kenaikan berlanjut";
  } else if (volDown > volUp * 1.3 && priceChange5d < 0) {
    pattern = "Distribusi";
    signal = "BEARISH";
    score = -1.5;
    desc = `Volume hari turun (${volDown.toFixed(0)}) > hari naik (${volUp.toFixed(0)}). Harga turun dalam 5 hari terakhir.`;
    impl = "Smart money sedang distribusi/distress sell";
  } else if (volUp > volDown && priceChange5d > 0) {
    pattern = "Konfirmasi Naik";
    signal = "BULLISH";
    score = 1;
    desc = "Volume mendukung kenaikan harga";
    impl = "Tren naik terkonfirmasi volume";
  } else if (volDown > volUp && priceChange5d < 0) {
    pattern = "Konfirmasi Turun";
    signal = "BEARISH";
    score = -1;
    desc = "Volume mendukung penurunan harga";
    impl = "Tren turun terkonfirmasi volume";
  } else {
    pattern = "Mixed / Sideway";
    signal = "NEUTRAL";
    score = 0;
    desc = "Volume tidak konfirmasikan arah harga";
    impl = "Tunggu konfirmasi sebelum entry";
  }

  return {
    name: "Volume Behavior",
    pattern,
    signal,
    score,
    description: desc,
    implication: impl,
  };
}

/**
 * Momentum analysis
 */
function analyzeMomentum(prices: StockPrice[]): BehavioralPattern {
  if (prices.length < 20) {
    return {
      name: "Momentum",
      pattern: "Insufficient Data",
      signal: "NEUTRAL",
      score: 0,
      description: "Data tidak cukup",
      implication: "Butuh minimal 20 hari",
    };
  }

  const closes = prices.map((p) => p.close);
  const totalReturn = ((closes[closes.length - 1] - closes[closes.length - 20]) / closes[closes.length - 20]) * 100;

  const recentReturns = closes.slice(-20).map((c, i, arr) =>
    i === 0 ? 0 : (c - arr[i - 1]) / arr[i - 1],
  );
  const positiveDays = recentReturns.filter((r) => r > 0).length;
  const consistency = positiveDays / recentReturns.length;

  let pattern: string, signal: BehavioralSignal, score: number, desc: string, impl: string;

  if (totalReturn > 15 && consistency > 0.6) {
    pattern = "Strong Uptrend";
    signal = "STRONG_BULLISH";
    score = 2;
    desc = `Total return 20d: +${totalReturn.toFixed(1)}%, konsistensi naik ${(consistency * 100).toFixed(0)}%`;
    impl = "Momentum bullish kuat — tapi waspadai overbought";
  } else if (totalReturn > 5 && consistency > 0.5) {
    pattern = "Steady Uptrend";
    signal = "BULLISH";
    score = 1;
    desc = `Total return 20d: +${totalReturn.toFixed(1)}%, tren naik konsisten`;
    impl = "Momentum positif, masih bisa di-trend-follow";
  } else if (totalReturn < -15 && consistency < 0.4) {
    pattern = "Strong Downtrend";
    signal = "STRONG_BEARISH";
    score = -2;
    desc = `Total return 20d: ${totalReturn.toFixed(1)}%, konsistensi turun ${((1 - consistency) * 100).toFixed(0)}%`;
    impl = "Momentum bearish kuat — hindari catch-the-falling-knife";
  } else if (totalReturn < -5 && consistency < 0.5) {
    pattern = "Steady Downtrend";
    signal = "BEARISH";
    score = -1;
    desc = `Total return 20d: ${totalReturn.toFixed(1)}%, tren turun`;
    impl = "Tekanan jual masih dominan";
  } else if (Math.abs(totalReturn) < 3) {
    pattern = "Sideway / Chop";
    signal = "NEUTRAL";
    score = 0;
    desc = `Total return 20d: ${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(1)}%, harga konsolidasi`;
    impl = "Tunggu breakout untuk konfirmasi arah";
  } else {
    pattern = "Mixed";
    signal = "NEUTRAL";
    score = 0;
    desc = `Total return 20d: ${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(1)}%, momentum belum jelas`;
    impl = "Tunggu konfirmasi";
  }

  return {
    name: "Momentum",
    pattern,
    signal,
    score,
    description: desc,
    implication: impl,
  };
}

/**
 * Volatility Pattern
 */
function analyzeVolatility(prices: StockPrice[]): BehavioralPattern {
  if (prices.length < 20) {
    return {
      name: "Volatility",
      pattern: "Insufficient Data",
      signal: "NEUTRAL",
      score: 0,
      description: "Data tidak cukup",
      implication: "N/A",
    };
  }

  const closes = prices.map((p) => p.close);
  const returns = closes.slice(-20).map((c, i, arr) =>
    i === 0 ? 0 : (c - arr[i - 1]) / arr[i - 1],
  );
  const std = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);
  const annualizedVol = std * Math.sqrt(252) * 100;

  let pattern: string, signal: BehavioralSignal, score: number, desc: string, impl: string;

  if (annualizedVol > 50) {
    pattern = "Sangat Volatile";
    signal = "NEUTRAL";
    score = 0;
    desc = `Volatilitas ${annualizedVol.toFixed(1)}% per tahun — sangat tinggi`;
    impl = "Cocok untuk trader agresif, AVOID untuk konservatif";
  } else if (annualizedVol > 35) {
    pattern = "Volatile";
    signal = "NEUTRAL";
    score = 0;
    desc = `Volatilitas ${annualizedVol.toFixed(1)}% per tahun — tinggi`;
    impl = "Fluktuasi besar, sizing harus kecil";
  } else if (annualizedVol > 20) {
    pattern = "Moderate";
    signal = "NEUTRAL";
    score = 0;
    desc = `Volatilitas ${annualizedVol.toFixed(1)}% per tahun — moderat`;
    impl = "Risiko proporsional, umum untuk saham IDX";
  } else {
    pattern = "Stabil";
    signal = "BULLISH";
    score = 0.5;
    desc = `Volatilitas ${annualizedVol.toFixed(1)}% per tahun — rendah/stabil`;
    impl = "Cocok untuk investor konservatif";
  }

  return {
    name: "Volatility",
    pattern,
    signal,
    score,
    description: desc,
    implication: impl,
  };
}

/**
 * Trading Range
 */
function analyzeTradingRange(prices: StockPrice[]): BehavioralPattern {
  if (prices.length < 30) {
    return {
      name: "Trading Range",
      pattern: "Insufficient Data",
      signal: "NEUTRAL",
      score: 0,
      description: "Data tidak cukup",
      implication: "N/A",
    };
  }

  const recent = prices.slice(-30);
  const high = Math.max(...recent.map((p) => p.high));
  const low = Math.min(...recent.map((p) => p.low));
  const close = recent[recent.length - 1].close;
  const rangeSize = ((high - low) / close) * 100;
  const positionInRange = high > low ? ((close - low) / (high - low)) * 100 : 50;

  let pattern = "Normal Range";
  let impl = "Perdagangan normal";

  if (rangeSize < 8) {
    pattern = "Tight Range";
    impl = "Potensi breakout besar — pantau tembusan";
  } else if (rangeSize > 25) {
    pattern = "Wide Range";
    impl = "Saham aktif, peluang intraday/swing lebih banyak";
  }

  if (positionInRange > 80) {
    pattern += " (dekat resistance)";
    impl += " — dekat resistance, waspadai penolakan";
  } else if (positionInRange < 20) {
    pattern += " (dekat support)";
    impl += " — dekat support, pantau pantulan";
  }

  const desc = `Range 30d (${rangeSize.toFixed(1)}%), harga di ${positionInRange.toFixed(0)}% range`;

  return {
    name: "Trading Range",
    pattern,
    signal: "NEUTRAL",
    score: 0,
    description: desc,
    implication: impl,
  };
}

/**
 * Price Action - Higher Highs/Lows analysis
 */
function analyzePriceAction(prices: StockPrice[]): BehavioralPattern {
  if (prices.length < 10) {
    return {
      name: "Price Action",
      pattern: "Insufficient Data",
      signal: "NEUTRAL",
      score: 0,
      description: "Data tidak cukup",
      implication: "N/A",
    };
  }

  const recent3 = prices.slice(-3);
  const recent10 = prices.slice(-10);

  const highsRecent = Math.max(...recent3.map((p) => p.high));
  const highsPrev = Math.max(...recent10.slice(0, -3).map((p) => p.high));
  const lowsRecent = Math.min(...recent3.map((p) => p.low));
  const lowsPrev = Math.min(...recent10.slice(0, -3).map((p) => p.low));

  const higherHigh = highsRecent > highsPrev;
  const higherLow = lowsRecent > lowsPrev;
  const lowerHigh = highsRecent < highsPrev;
  const lowerLow = lowsRecent < lowsPrev;

  let pattern: string, signal: BehavioralSignal, score: number, desc: string, impl: string;

  if (higherHigh && higherLow) {
    pattern = "Higher Highs & Higher Lows";
    signal = "BULLISH";
    score = 1.5;
    desc = "Higher highs & higher lows — uptrend sehat";
    impl = "Pattern bullish — trend-follow masih aman";
  } else if (lowerHigh && lowerLow) {
    pattern = "Lower Highs & Lower Lows";
    signal = "BEARISH";
    score = -1.5;
    desc = "Lower highs & lower lows — downtrend terkonfirmasi";
    impl = "Hindari posisi buy, tunggu reversal";
  } else if (higherHigh && lowerLow) {
    pattern = "Expansion / Volatile";
    signal = "NEUTRAL";
    score = 0;
    desc = "Higher high tapi lower low — pasar tidak menentu";
    impl = "Tunggu konfirmasi arah";
  } else {
    pattern = "Consolidation";
    signal = "NEUTRAL";
    score = 0;
    desc = "Tidak ada pola jelas, harga konsolidasi";
    impl = "Tunggu breakout";
  }

  return {
    name: "Price Action",
    pattern,
    signal,
    score,
    description: desc,
    implication: impl,
  };
}

/**
 * Support & Resistance
 */
function findSupportResistance(prices: StockPrice[]): { support: number[]; resistance: number[] } {
  if (prices.length < 20) return { support: [], resistance: [] };

  const recent = prices.slice(-60);
  const currentPrice = recent[recent.length - 1].close;
  const supports: number[] = [];
  const resistances: number[] = [];

  const lows = recent.map((p) => p.low);
  const highs = recent.map((p) => p.high);

  for (let i = 2; i < lows.length - 2; i++) {
    if (
      lows[i] < lows[i - 1] &&
      lows[i] < lows[i + 1] &&
      lows[i] < lows[i - 2] &&
      lows[i] < lows[i + 2]
    ) {
      supports.push(lows[i]);
    }
  }

  for (let i = 2; i < highs.length - 2; i++) {
    if (
      highs[i] > highs[i - 1] &&
      highs[i] > highs[i + 1] &&
      highs[i] > highs[i - 2] &&
      highs[i] > highs[i + 2]
    ) {
      resistances.push(highs[i]);
    }
  }

  const filteredSupports = supports.filter(
    (s) => Math.abs(s - currentPrice) / currentPrice < 0.15,
  );
  const filteredResistances = resistances.filter(
    (r) => Math.abs(r - currentPrice) / currentPrice < 0.15,
  );

  const supportsBelow = filteredSupports
    .filter((s) => s < currentPrice)
    .sort((a, b) => a - b)
    .slice(-2);
  const resistancesAbove = filteredResistances
    .filter((r) => r > currentPrice)
    .sort((a, b) => a - b)
    .slice(0, 2);

  return { support: supportsBelow, resistance: resistancesAbove };
}

export function analyzeBehavioral(prices: StockPrice[]): BehavioralAnalysisResult {
  if (prices.length < 20) {
    return {
      patterns: [],
      overallScore: 0,
      overallSignal: "NEUTRAL",
      supportLevels: [],
      resistanceLevels: [],
      summary: "Data historis tidak cukup untuk analisa behavioral",
    };
  }

  const patterns: BehavioralPattern[] = [
    analyzeVolumeBehavior(prices),
    analyzeMomentum(prices),
    analyzeVolatility(prices),
    analyzeTradingRange(prices),
    analyzePriceAction(prices),
  ];

  const { support, resistance } = findSupportResistance(prices);

  const scores = patterns.map((p) => p.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const overallScore = Math.round(avgScore * 25 * 100) / 100;

  let overallSignal: BehavioralSignal;
  if (overallScore >= 60) overallSignal = "STRONG_BULLISH";
  else if (overallScore >= 20) overallSignal = "BULLISH";
  else if (overallScore <= -60) overallSignal = "STRONG_BEARISH";
  else if (overallScore <= -20) overallSignal = "BEARISH";
  else overallSignal = "NEUTRAL";

  const moodMap: Record<BehavioralSignal, string> = {
    STRONG_BULLISH: "sangat bullish",
    BULLISH: "bullish",
    NEUTRAL: "netral",
    BEARISH: "bearish",
    STRONG_BEARISH: "sangat bearish",
  };

  const supportStr = support.length > 0 ? support.map((s) => `Rp ${Math.round(s).toLocaleString("id-ID")}`).join(", ") : "tidak terdeteksi";
  const resistStr = resistance.length > 0 ? resistance.map((r) => `Rp ${Math.round(r).toLocaleString("id-ID")}`).join(", ") : "tidak terdeteksi";

  const significant = [...patterns].sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).slice(0, 2);

  const summary = `Pola perilaku saham menunjukkan bias **${moodMap[overallSignal]}**. Support: ${supportStr}. Resistance: ${resistStr}.\n\nPola dominan:\n- ${significant.map((p) => `**${p.pattern}**: ${p.description}`).join("\n- ")}`;

  return {
    patterns,
    overallScore,
    overallSignal,
    supportLevels: support,
    resistanceLevels: resistance,
    summary,
  };
}
