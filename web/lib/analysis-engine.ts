/**
 * Advanced Analysis Engine
 * Multi-timeframe confluence, weighted scoring, pattern recognition,
 * dan support/resistance detection yang lebih sophisticated.
 *
 * Semua output dalam Bahasa Indonesia.
 */

import type { StockPrice } from "./yahoo";
import type { Signal, IndicatorResult } from "./technical";
import { SMA, RSI, MACD, BollingerBands, Stochastic } from "technicalindicators";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type Timeframe = "1d" | "1wk" | "1mo";
export type Bias = "bullish" | "bearish" | "neutral";

export interface TimeframeSignal {
  timeframe: Timeframe;
  label: string;       // "Harian" / "Mingguan" / "Bulanan"
  bias: Bias;
  score: number;       // -100..+100
  signal: Signal;
  details: string;
}

export interface ConfluenceResult {
  timeframes: TimeframeSignal[];
  confluenceScore: number;      // -100..+100, weighted avg
  confluenceSignal: Signal;
  confluenceLabel: string;      // "3/3 Bullish", "2/3 Bullish", etc.
  agreementCount: { bullish: number; bearish: number; neutral: number };
  summary: string;
}

export interface SupportResistanceLevel {
  price: number;
  type: "support" | "resistance";
  strength: number;     // 1-5, how many touches / volume
  touches: number;
  volumeAtLevel: number;
  distance: number;     // % from current price
  label: string;        // "Support 1" / "Resistance 1"
}

export interface SupportResistanceResult {
  supportLevels: SupportResistanceLevel[];
  resistanceLevels: SupportResistanceLevel[];
  pivotPoint: number;
  pivotHigh: number;
  pivotLow: number;
  currentPrice: number;
  summary: string;
}

export interface SignalWeight {
  category: string;
  label: string;
  weight: number;   // 0..1
  indicators: string[];
}

export interface WeightedCategoryScore {
  category: string;
  label: string;
  weight: number;
  score: number;       // -100..+100
  signal: Signal;
  indicators: { name: string; score: number }[];
}

export interface WeightedScoringResult {
  categories: WeightedCategoryScore[];
  overallScore: number;
  overallSignal: Signal;
  weights: SignalWeight[];
  summary: string;
}

export type PatternType = "candlestick" | "chart";
export type PatternBias = "bullish" | "bearish" | "neutral";

export interface DetectedPattern {
  name: string;
  nameId: string;       // Indonesian name
  type: PatternType;
  bias: PatternBias;
  confidence: number;   // 0-100
  barIndex: number;     // which bar the pattern is at (0 = current)
  description: string;
  implication: string;
}

export interface PatternRecognitionResult {
  patterns: DetectedPattern[];
  dominantBias: PatternBias;
  summary: string;
}

// ─────────────────────────────────────────────────────────────
// 1. MULTI-TIMEFRAME CONFLUENCE
// ─────────────────────────────────────────────────────────────

/**
 * Menghitung sinyal teknikal untuk satu timeframe.
 * prices harus sudah di-fetch dengan interval yang sesuai.
 */
export function analyzeTimeframeSignal(
  prices: StockPrice[],
  timeframe: Timeframe,
): TimeframeSignal {
  const labels: Record<Timeframe, string> = {
    "1d": "Harian",
    "1wk": "Mingguan",
    "1mo": "Bulanan",
  };

  if (prices.length < 20) {
    return {
      timeframe,
      label: labels[timeframe],
      bias: "neutral",
      score: 0,
      signal: "NEUTRAL",
      details: "Data tidak cukup untuk analisa timeframe ini",
    };
  }

  const closes = prices.map((p) => p.close);
  const n = closes.length;
  const current = closes[n - 1];

  let totalScore = 0;
  let count = 0;
  const details: string[] = [];

  // RSI
  if (closes.length >= 15) {
    const rsiVals = RSI.calculate({ values: closes, period: 14 });
    const rsi = rsiVals[rsiVals.length - 1];
    if (rsi !== undefined) {
      if (rsi >= 70) { totalScore -= 1; details.push(`RSI ${rsi.toFixed(0)} overbought`); }
      else if (rsi <= 30) { totalScore += 1; details.push(`RSI ${rsi.toFixed(0)} oversold`); }
      count++;
    }
  }

  // MACD
  if (closes.length >= 35) {
    const macdData = MACD.calculate({
      values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9,
      SimpleMAOscillator: false, SimpleMASignal: false,
    });
    const cur = macdData[macdData.length - 1];
    if (cur?.MACD !== undefined && cur?.signal !== undefined && cur?.histogram !== undefined) {
      if (cur.MACD > cur.signal && cur.histogram > 0) {
        totalScore += 1;
        details.push("MACD bullish");
      } else if (cur.MACD < cur.signal && cur.histogram < 0) {
        totalScore -= 1;
        details.push("MACD bearish");
      }
      count++;
    }
  }

  // Moving averages
  if (closes.length >= 50) {
    const sma20Vals = SMA.calculate({ values: closes, period: 20 });
    const sma50Vals = SMA.calculate({ values: closes, period: 50 });
    const sma20 = sma20Vals[sma20Vals.length - 1];
    const sma50 = sma50Vals[sma50Vals.length - 1];
    if (sma20 !== undefined && sma50 !== undefined) {
      if (current > sma20 && sma20 > sma50) {
        totalScore += 1.5;
        details.push("Harga > SMA20 > SMA50");
      } else if (current < sma20 && sma20 < sma50) {
        totalScore -= 1.5;
        details.push("Harga < SMA20 < SMA50");
      }
      count++;
    }
  }

  // Stochastic
  if (closes.length >= 17) {
    const stoch = Stochastic.calculate({
      high: prices.map((p) => p.high),
      low: prices.map((p) => p.low),
      close: closes,
      period: 14,
      signalPeriod: 3,
    });
    const cur = stoch[stoch.length - 1];
    if (cur) {
      if (cur.k > 80 && cur.d > 80) { totalScore -= 0.5; }
      else if (cur.k < 20 && cur.d < 20) { totalScore += 0.5; }
      count++;
    }
  }

  const normalizedScore = count > 0
    ? Math.round(Math.max(-100, Math.min(100, (totalScore / count) * 100)))
    : 0;

  const bias = scoreToBias(normalizedScore);
  const signal = scoreToSignal(normalizedScore);

  return {
    timeframe,
    label: labels[timeframe],
    bias,
    score: normalizedScore,
    signal,
    details: details.join(", ") || "Tidak ada sinyal dominan",
  };
}

/** Shared function: numeric score → Signal */
function scoreToSignal(score: number): Signal {
  if (score >= 60) return "STRONG_BUY";
  if (score >= 20) return "BUY";
  if (score <= -60) return "STRONG_SELL";
  if (score <= -20) return "SELL";
  return "NEUTRAL";
}

function scoreToBias(score: number): Bias {
  return score >= 15 ? "bullish" : score <= -15 ? "bearish" : "neutral";
}

/**
 * Multi-timeframe confluence: analisa sinyal di 3 timeframe.
 * pricesDaily = data harian (minimal 60 hari), pricesWeekly = mingguan, pricesMonthly = bulanan.
 */
export function analyzeConfluence(
  pricesDaily: StockPrice[],
  pricesWeekly: StockPrice[],
  pricesMonthly: StockPrice[],
): ConfluenceResult {
  const daily = analyzeTimeframeSignal(pricesDaily, "1d");
  const weekly = analyzeTimeframeSignal(pricesWeekly, "1wk");
  const monthly = analyzeTimeframeSignal(pricesMonthly, "1mo");

  const timeframes = [daily, weekly, monthly];

  // Weighted average: daily 40%, weekly 35%, monthly 25%
  const confluenceScore = Math.round(
    daily.score * 0.40 + weekly.score * 0.35 + monthly.score * 0.25,
  );

  const confluenceSignal = scoreToSignal(confluenceScore);

  const bullish = timeframes.filter((t) => t.bias === "bullish").length;
  const bearish = timeframes.filter((t) => t.bias === "bearish").length;
  const neutral = 3 - bullish - bearish;

  let confluenceLabel: string;
  if (bullish === 3) confluenceLabel = "3/3 Bullish — Konfirmasi Kuat";
  else if (bullish === 2) confluenceLabel = "2/3 Bullish — Sebagian Konfirmasi";
  else if (bearish === 3) confluenceLabel = "3/3 Bearish — Konfirmasi Kuat";
  else if (bearish === 2) confluenceLabel = "2/3 Bearish — Sebagian Konfirmasi";
  else confluenceLabel = "Mixed / Netral";

  const summary = `Konfluensi multi-timeframe: ${confluenceLabel}. ` +
    `Skor gabungan: ${confluenceScore >= 0 ? "+" : ""}${confluenceScore}/100. ` +
    `Harian: ${daily.bias}, Mingguan: ${weekly.bias}, Bulanan: ${monthly.bias}.`;

  return {
    timeframes,
    confluenceScore,
    confluenceSignal,
    confluenceLabel,
    agreementCount: { bullish, bearish, neutral },
    summary,
  };
}

// ─────────────────────────────────────────────────────────────
// 2. SUPPORT / RESISTANCE AUTO-DETECTION
// ─────────────────────────────────────────────────────────────

/**
 * Mendeteksi level support dan resistance secara otomatis
 * menggunakan pivot points + volume clusters.
 */
export function detectSupportResistance(prices: StockPrice[]): SupportResistanceResult {
  if (prices.length < 20) {
    return {
      supportLevels: [],
      resistanceLevels: [],
      pivotPoint: 0,
      pivotHigh: 0,
      pivotLow: 0,
      currentPrice: 0,
      summary: "Data tidak cukup untuk deteksi support/resistance",
    };
  }

  const currentPrice = prices[prices.length - 1].close;

  // ── Pivot Points (Classic) dari data terakhir ──
  const recent = prices.slice(-20);
  const pivotHigh = Math.max(...recent.map((p) => p.high));
  const pivotLow = Math.min(...recent.map((p) => p.low));
  const pivotClose = recent[recent.length - 1].close;
  const pivotPoint = (pivotHigh + pivotLow + pivotClose) / 3;

  // ── Swing High/Low Detection ──
  const lookbackWindow = Math.min(60, prices.length);
  const data = prices.slice(-lookbackWindow);

  const swingLows: { price: number; idx: number }[] = [];
  const swingHighs: { price: number; idx: number }[] = [];

  const lookback = 3;
  for (let i = lookback; i < data.length - lookback; i++) {
    let isSwingLow = true;
    let isSwingHigh = true;

    for (let j = 1; j <= lookback; j++) {
      if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) {
        isSwingLow = false;
      }
      if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) {
        isSwingHigh = false;
      }
    }

    if (isSwingLow) swingLows.push({ price: data[i].low, idx: i });
    if (isSwingHigh) swingHighs.push({ price: data[i].high, idx: i });
  }

  // ── Volume Cluster Detection ──
  // Cari harga di mana volume tinggi (potential S/R)
  const priceStep = currentPrice * 0.005; // 0.5% bucket
  const volumeBuckets = new Map<number, number>();

  for (const p of data) {
    const bucket = Math.round(p.close / priceStep) * priceStep;
    volumeBuckets.set(bucket, (volumeBuckets.get(bucket) ?? 0) + p.volume);
  }

  const avgVolume = data.reduce((s, p) => s + p.volume, 0) / data.length;
  const highVolumeLevels: { price: number; volume: number }[] = [];

  volumeBuckets.forEach((vol, price) => {
    if (vol > avgVolume * 1.5) {
      highVolumeLevels.push({ price, volume: vol });
    }
  });

  // ── Merge & Score Levels ──
  interface LevelCandidate {
    price: number;
    touches: number;
    volumeAtLevel: number;
    isSwing: boolean;
  }

  const levelCandidates = new Map<number, LevelCandidate>();

  // Add swing lows as support candidates
  for (const sl of swingLows) {
    const rounded = Math.round(sl.price / priceStep) * priceStep;
    const existing = levelCandidates.get(rounded);
    if (existing) {
      existing.touches++;
      existing.isSwing = true;
    } else {
      levelCandidates.set(rounded, { price: rounded, touches: 1, volumeAtLevel: 0, isSwing: true });
    }
  }

  // Add swing highs as resistance candidates
  for (const sh of swingHighs) {
    const rounded = Math.round(sh.price / priceStep) * priceStep;
    const existing = levelCandidates.get(rounded);
    if (existing) {
      existing.touches++;
      existing.isSwing = true;
    } else {
      levelCandidates.set(rounded, { price: rounded, touches: 1, volumeAtLevel: 0, isSwing: true });
    }
  }

  // Add volume clusters
  for (const hv of highVolumeLevels) {
    const rounded = Math.round(hv.price / priceStep) * priceStep;
    const existing = levelCandidates.get(rounded);
    if (existing) {
      existing.volumeAtLevel = hv.volume;
    } else {
      levelCandidates.set(rounded, { price: rounded, touches: 0, volumeAtLevel: hv.volume, isSwing: false });
    }
  }

  // Classify into support & resistance
  const supportLevels: SupportResistanceLevel[] = [];
  const resistanceLevels: SupportResistanceLevel[] = [];

  levelCandidates.forEach((candidate) => {
    const dist = Math.abs(candidate.price - currentPrice) / currentPrice;
    if (dist > 0.2) return; // Too far, skip (return in forEach)

    const strength = Math.min(5,
      (candidate.isSwing ? 2 : 0) +
      candidate.touches +
      (candidate.volumeAtLevel > avgVolume * 2 ? 1 : 0) +
      (dist < 0.03 ? 1 : 0), // Close to current = stronger
    );

    const level: SupportResistanceLevel = {
      price: Math.round(candidate.price),
      type: candidate.price < currentPrice ? "support" : "resistance",
      strength,
      touches: candidate.touches,
      volumeAtLevel: candidate.volumeAtLevel,
      distance: Math.round(dist * 10000) / 100,
      label: "", // Set below
    };

    if (level.type === "support") {
      supportLevels.push(level);
    } else {
      resistanceLevels.push(level);
    }
  });

  // Sort & label
  supportLevels.sort((a, b) => b.price - a.price); // Closest first
  resistanceLevels.sort((a, b) => a.price - b.price); // Closest first

  supportLevels.slice(0, 5).forEach((l, i) => { l.label = `Support ${i + 1}`; });
  resistanceLevels.slice(0, 5).forEach((l, i) => { l.label = `Resistance ${i + 1}`; });

  const topSupport = supportLevels.slice(0, 3);
  const topResistance = resistanceLevels.slice(0, 3);

  const fmtPrice = (p: number) => `Rp ${p.toLocaleString("id-ID")}`;
  const supStr = topSupport.length > 0
    ? topSupport.map((s) => `${fmtPrice(s.price)} (${s.strength}★)`).join(", ")
    : "tidak terdeteksi";
  const resStr = topResistance.length > 0
    ? topResistance.map((r) => `${fmtPrice(r.price)} (${r.strength}★)`).join(", ")
    : "tidak terdeteksi";

  return {
    supportLevels: topSupport,
    resistanceLevels: topResistance,
    pivotPoint: Math.round(pivotPoint),
    pivotHigh: Math.round(pivotHigh),
    pivotLow: Math.round(pivotLow),
    currentPrice: Math.round(currentPrice),
    summary: `Level support utama: ${supStr}. Level resistance utama: ${resStr}. Pivot point: ${fmtPrice(Math.round(pivotPoint))}.`,
  };
}

// ─────────────────────────────────────────────────────────────
// 3. WEIGHTED SIGNAL SCORING
// ─────────────────────────────────────────────────────────────

const DEFAULT_SIGNAL_WEIGHTS: SignalWeight[] = [
  {
    category: "trend",
    label: "Tren",
    weight: 0.33,
    indicators: ["Moving Averages", "MACD"],
  },
  {
    category: "momentum",
    label: "Momentum",
    weight: 0.28,
    indicators: ["RSI (14)", "Stochastic"],
  },
  {
    category: "volume",
    label: "Volume",
    weight: 0.22,
    indicators: ["Volume", "OBV"],
  },
  {
    category: "volatility",
    label: "Volatilitas",
    weight: 0.17,
    indicators: ["Bollinger Bands", "ATR"],
  },
];

/**
 * Menghitung weighted score berdasarkan kategori.
 * indicators = array of IndicatorResult dari technical analysis.
 */
export function calculateWeightedScore(
  indicators: IndicatorResult[],
  customWeights?: Partial<Record<string, number>>,
): WeightedScoringResult {
  const weights = DEFAULT_SIGNAL_WEIGHTS.map((w) => ({
    ...w,
    weight: customWeights?.[w.category] ?? w.weight,
  }));

  // Normalize weights to sum = 1
  const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
  if (totalWeight > 0) {
    for (const w of weights) w.weight /= totalWeight;
  }

  const categories: WeightedCategoryScore[] = weights.map((w) => {
    const matched = indicators.filter((ind) =>
      w.indicators.some((name) => ind.name.includes(name) || name.includes(ind.name)),
    );

    let catScore: number;
    let catIndicators: { name: string; score: number }[];

    if (matched.length > 0) {
      const avg = matched.reduce((s, m) => s + m.score, 0) / matched.length;
      catScore = Math.round(Math.max(-100, Math.min(100, avg * 50)));
      catIndicators = matched.map((m) => ({ name: m.name, score: m.score }));
    } else {
      // No matching indicators — try to infer from all
      catScore = 0;
      catIndicators = [];
    }

    return {
      category: w.category,
      label: w.label,
      weight: w.weight,
      score: catScore,
      signal: scoreToSignal(catScore),
      indicators: catIndicators,
    };
  });

  const overallScore = Math.round(
    categories.reduce((s, c) => s + c.score * c.weight, 0),
  );
  const overallSignal = scoreToSignal(overallScore);

  const breakdown = categories
    .map((c) => `${c.label} (${(c.weight * 100).toFixed(0)}%): ${c.score >= 0 ? "+" : ""}${c.score}`)
    .join(", ");

  return {
    categories,
    overallScore,
    overallSignal,
    weights,
    summary: `Skor tertimbang: ${overallScore >= 0 ? "+" : ""}${overallScore}/100. Breakdown: ${breakdown}.`,
  };
}

// ─────────────────────────────────────────────────────────────
// 4. CANDLESTICK & CHART PATTERN RECOGNITION
// ─────────────────────────────────────────────────────────────

function bodySize(p: StockPrice): number {
  return Math.abs(p.close - p.open);
}

function upperShadow(p: StockPrice): number {
  return p.high - Math.max(p.open, p.close);
}

function lowerShadow(p: StockPrice): number {
  return Math.min(p.open, p.close) - p.low;
}

function range(p: StockPrice): number {
  return p.high - p.low;
}

function isBullish(p: StockPrice): boolean {
  return p.close > p.open;
}

function isBearish(p: StockPrice): boolean {
  return p.close < p.open;
}

/**
 * Mendeteksi pola candlestick dari data harga.
 */
export function detectPatterns(prices: StockPrice[]): PatternRecognitionResult {
  if (prices.length < 10) {
    return {
      patterns: [],
      dominantBias: "neutral",
      summary: "Data tidak cukup untuk deteksi pola",
    };
  }

  const patterns: DetectedPattern[] = [];
  const n = prices.length;

  // Scan last 10 bars for patterns
  const scanStart = Math.max(0, n - 10);

  for (let i = scanStart; i < n; i++) {
    const p = prices[i];
    const prev = i > 0 ? prices[i - 1] : null;
    const prev2 = i > 1 ? prices[i - 2] : null;
    const barFromEnd = n - 1 - i; // 0 = current bar

    const r = range(p);
    if (r === 0) continue;

    const body = bodySize(p);
    const uShadow = upperShadow(p);
    const lShadow = lowerShadow(p);
    const bodyRatio = body / r;

    // ── Doji ──
    if (bodyRatio < 0.1 && r > 0) {
      patterns.push({
        name: "Doji",
        nameId: "Doji",
        type: "candlestick",
        bias: "neutral",
        confidence: 70,
        barIndex: barFromEnd,
        description: "Body sangat kecil, menunjukkan keraguan pasar",
        implication: "Kemungkinan reversal atau kelanjutan konsolidasi",
      });
    }

    // ── Hammer (bullish reversal) ──
    if (lShadow > body * 2 && uShadow < body * 0.5 && body > 0) {
      patterns.push({
        name: isBullish(p) ? "Hammer" : "Hanging Man",
        nameId: isBullish(p) ? "Palu" : "Orang Gantung",
        type: "candlestick",
        bias: isBullish(p) ? "bullish" : "bearish",
        confidence: 65,
        barIndex: barFromEnd,
        description: `Shadow bawah panjang, body kecil di atas. ${isBullish(p) ? "Palu (bullish reversal)" : "Orang Gantung (bearish reversal setelah uptrend)"}`,
        implication: isBullish(p) ? "Potensi reversal bullish dari bawah" : "Potensi reversal bearish dari atas",
      });
    }

    // ── Shooting Star / Inverted Hammer ──
    if (uShadow > body * 2 && lShadow < body * 0.5 && body > 0) {
      patterns.push({
        name: isBearish(p) ? "Shooting Star" : "Inverted Hammer",
        nameId: isBearish(p) ? "Bintang Jatuh" : "Palu Terbalik",
        type: "candlestick",
        bias: isBearish(p) ? "bearish" : "bullish",
        confidence: 60,
        barIndex: barFromEnd,
        description: "Shadow atas panjang, body kecil di bawah",
        implication: isBearish(p) ? "Potensi reversal bearish dari atas" : "Potensi reversal bullish dari bawah",
      });
    }

    // ── Engulfing ──
    if (prev) {
      const prevBody = bodySize(prev);
      if (prevBody > 0 && body > 0) {
        // Bullish Engulfing
        if (isBearish(prev) && isBullish(p) &&
          p.open <= prev.close && p.close >= prev.open &&
          body > prevBody) {
          patterns.push({
            name: "Bullish Engulfing",
            nameId: "Engulfing Bullish",
            type: "candlestick",
            bias: "bullish",
            confidence: 75,
            barIndex: barFromEnd,
            description: "Candle bullish menelan seluruh candle bearish sebelumnya",
            implication: "Sinyal reversal bullish yang kuat",
          });
        }

        // Bearish Engulfing
        if (isBullish(prev) && isBearish(p) &&
          p.open >= prev.close && p.close <= prev.open &&
          body > prevBody) {
          patterns.push({
            name: "Bearish Engulfing",
            nameId: "Engulfing Bearish",
            type: "candlestick",
            bias: "bearish",
            confidence: 75,
            barIndex: barFromEnd,
            description: "Candle bearish menelan seluruh candle bullish sebelumnya",
            implication: "Sinyal reversal bearish yang kuat",
          });
        }
      }
    }

    // ── Morning Star / Evening Star (3-candle) ──
    if (prev && prev2) {
      const prev2Body = bodySize(prev2);
      const prevBody = bodySize(prev);

      // Morning Star
      if (isBearish(prev2) && prev2Body > 0 && prevBody < prev2Body * 0.3 && isBullish(p) && body > prev2Body * 0.5) {
        patterns.push({
          name: "Morning Star",
          nameId: "Bintang Fajar",
          type: "candlestick",
          bias: "bullish",
          confidence: 80,
          barIndex: barFromEnd,
          description: "3 candle: bearish besar, kecil, lalu bullish besar — reversal bullish",
          implication: "Sinyal pembalikan tren bullish yang kuat",
        });
      }

      // Evening Star
      if (isBullish(prev2) && prev2Body > 0 && prevBody < prev2Body * 0.3 && isBearish(p) && body > prev2Body * 0.5) {
        patterns.push({
          name: "Evening Star",
          nameId: "Bintang Senja",
          type: "candlestick",
          bias: "bearish",
          confidence: 80,
          barIndex: barFromEnd,
          description: "3 candle: bullish besar, kecil, lalu bearish besar — reversal bearish",
          implication: "Sinyal pembalikan tren bearish yang kuat",
        });
      }
    }

    // ── Marubozu (full body, no shadows) ──
    if (bodyRatio > 0.9 && r > 0) {
      patterns.push({
        name: isBullish(p) ? "Bullish Marubozu" : "Bearish Marubozu",
        nameId: isBullish(p) ? "Marubozu Bullish" : "Marubozu Bearish",
        type: "candlestick",
        bias: isBullish(p) ? "bullish" : "bearish",
        confidence: 70,
        barIndex: barFromEnd,
        description: `Body penuh tanpa shadow — ${isBullish(p) ? "buyer dominan total" : "seller dominan total"}`,
        implication: isBullish(p) ? "Tekanan beli sangat kuat" : "Tekanan jual sangat kuat",
      });
    }

    // ── Dragonfly / Gravestone Doji ──
    if (bodyRatio < 0.05 && r > 0) {
      if (lShadow > r * 0.7 && uShadow < r * 0.1) {
        patterns.push({
          name: "Dragonfly Doji",
          nameId: "Doji Capung",
          type: "candlestick",
          bias: "bullish",
          confidence: 65,
          barIndex: barFromEnd,
          description: "Doji dengan shadow bawah panjang — rejection bawah",
          implication: "Potensi reversal bullish",
        });
      }
      if (uShadow > r * 0.7 && lShadow < r * 0.1) {
        patterns.push({
          name: "Gravestone Doji",
          nameId: "Doji Batu Nisan",
          type: "candlestick",
          bias: "bearish",
          confidence: 65,
          barIndex: barFromEnd,
          description: "Doji dengan shadow atas panjang — rejection atas",
          implication: "Potensi reversal bearish",
        });
      }
    }
  }

  // ── Chart Patterns (longer-term) ──
  if (n >= 30) {
    const recent30 = prices.slice(-30);
    const highs30 = recent30.map((p) => p.high);
    const lows30 = recent30.map((p) => p.low);
    const closes30 = recent30.map((p) => p.close);

    // Double Top detection
    const peaks = findPeaks(highs30, 3);
    if (peaks.length >= 2) {
      const last2 = peaks.slice(-2);
      const diff = Math.abs(highs30[last2[0]] - highs30[last2[1]]) / highs30[last2[0]];
      if (diff < 0.03 && last2[1] - last2[0] >= 5) {
        patterns.push({
          name: "Double Top",
          nameId: "Double Top",
          type: "chart",
          bias: "bearish",
          confidence: 60,
          barIndex: n - 1 - last2[1],
          description: "Dua puncak pada level yang sama — resistance kuat",
          implication: "Jika neckline (support antar puncak) ditembus, bearish reversal",
        });
      }
    }

    // Double Bottom detection
    const troughs = findTroughs(lows30, 3);
    if (troughs.length >= 2) {
      const last2 = troughs.slice(-2);
      const diff = Math.abs(lows30[last2[0]] - lows30[last2[1]]) / lows30[last2[0]];
      if (diff < 0.03 && last2[1] - last2[0] >= 5) {
        patterns.push({
          name: "Double Bottom",
          nameId: "Double Bottom",
          type: "chart",
          bias: "bullish",
          confidence: 60,
          barIndex: n - 1 - last2[1],
          description: "Dua lembah pada level yang sama — support kuat",
          implication: "Jika neckline (resistance antar lembah) ditembus, bullish reversal",
        });
      }
    }

    // Ascending Triangle (higher lows + flat resistance)
    if (troughs.length >= 2 && peaks.length >= 2) {
      const lastTroughs = troughs.slice(-2);
      const lastPeaks = peaks.slice(-2);
      const troughsRising = lows30[lastTroughs[1]] > lows30[lastTroughs[0]];
      const peaksFlat = Math.abs(highs30[lastPeaks[1]] - highs30[lastPeaks[0]]) / highs30[lastPeaks[0]] < 0.03;

      if (troughsRising && peaksFlat) {
        patterns.push({
          name: "Ascending Triangle",
          nameId: "Segitiga Naik",
          type: "chart",
          bias: "bullish",
          confidence: 55,
          barIndex: 0,
          description: "Higher lows dengan resistance datar — pressure bullish meningkat",
          implication: "Probabilitas breakout ke atas lebih tinggi",
        });
      }
    }
  }

  // ── Dominant bias ──
  const bullishConf = patterns.filter((p) => p.bias === "bullish").reduce((s, p) => s + p.confidence, 0);
  const bearishConf = patterns.filter((p) => p.bias === "bearish").reduce((s, p) => s + p.confidence, 0);

  const dominantBias: PatternBias =
    bullishConf > bearishConf + 20 ? "bullish" :
    bearishConf > bullishConf + 20 ? "bearish" : "neutral";

  const topPatterns = [...patterns].sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  const patternList = topPatterns.map((p) => `${p.nameId} (${p.bias}, ${p.confidence}%)`).join(", ");

  return {
    patterns,
    dominantBias,
    summary: patterns.length > 0
      ? `Terdeteksi ${patterns.length} pola. Dominan: ${dominantBias}. Pola utama: ${patternList}.`
      : "Tidak ada pola signifikan yang terdeteksi.",
  };
}

/** Helper: find peak indices */
function findPeaks(data: number[], lookback: number): number[] {
  const peaks: number[] = [];
  for (let i = lookback; i < data.length - lookback; i++) {
    let isPeak = true;
    for (let j = 1; j <= lookback; j++) {
      if (data[i] <= data[i - j] || data[i] <= data[i + j]) {
        isPeak = false;
        break;
      }
    }
    if (isPeak) peaks.push(i);
  }
  return peaks;
}

/** Helper: find trough indices */
function findTroughs(data: number[], lookback: number): number[] {
  const troughs: number[] = [];
  for (let i = lookback; i < data.length - lookback; i++) {
    let isTrough = true;
    for (let j = 1; j <= lookback; j++) {
      if (data[i] >= data[i - j] || data[i] >= data[i + j]) {
        isTrough = false;
        break;
      }
    }
    if (isTrough) troughs.push(i);
  }
  return troughs;
}
