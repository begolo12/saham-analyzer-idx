/**
 * Technical Analysis - Server-side
 * Menghitung indikator teknikal standar industri.
 */

import { RSI, MACD, BollingerBands, Stochastic, SMA, EMA, OBV } from "technicalindicators";
import type { StockPrice } from "./yahoo";

export type Signal = "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";

export const SIGNAL_INDONESIAN: Record<Signal, string> = {
  STRONG_BUY: "Sangat Bullish",
  BUY: "Bullish",
  NEUTRAL: "Netral",
  SELL: "Bearish",
  STRONG_SELL: "Sangat Bearish",
};

export const SIGNAL_EMOJI: Record<Signal, string> = {
  STRONG_BUY: "🟢🟢",
  BUY: "🟢",
  NEUTRAL: "🟡",
  SELL: "🔴",
  STRONG_SELL: "🔴🔴",
};

export const SIGNAL_SCORE: Record<Signal, number> = {
  STRONG_BUY: 2,
  BUY: 1,
  NEUTRAL: 0,
  SELL: -1,
  STRONG_SELL: -2,
};

export interface IndicatorResult {
  name: string;
  value: number | string | null;
  signal: Signal;
  score: number;
  explanation: string;
}

export interface TechnicalAnalysisResult {
  indicators: IndicatorResult[];
  overallScore: number; // -100..+100
  overallSignal: Signal;
  trend: "Uptrend" | "Downtrend" | "Sideways";
  summary: string;
  // Data untuk chart
  chartData: {
    sma20: (number | null)[];
    sma50: (number | null)[];
    sma200: (number | null)[];
    bbUpper: (number | null)[];
    bbLower: (number | null)[];
    bbMiddle: (number | null)[];
    rsi: (number | null)[];
    macd: (number | null)[];
    macdSignal: (number | null)[];
    macdHist: (number | null)[];
  };
}

function getClosePrices(prices: StockPrice[]): number[] {
  return prices.map((p) => p.close);
}

function getHighPrices(prices: StockPrice[]): number[] {
  return prices.map((p) => p.high);
}

function getLowPrices(prices: StockPrice[]): number[] {
  return prices.map((p) => p.low);
}

function getVolumes(prices: StockPrice[]): number[] {
  return prices.map((p) => p.volume);
}

/**
 * RSI Analysis
 */
function analyzeRSI(prices: StockPrice[]): IndicatorResult {
  const closes = getClosePrices(prices);
  const rsiValues = RSI.calculate({ values: closes, period: 14 });
  const rsi = rsiValues[rsiValues.length - 1];

  if (rsi === undefined) {
    return {
      name: "RSI (14)",
      value: null,
      signal: "NEUTRAL",
      score: 0,
      explanation: "Data RSI tidak cukup",
    };
  }

  let signal: Signal;
  let score: number;
  let explanation: string;

  if (rsi >= 80) {
    signal = "STRONG_SELL";
    score = -2;
    explanation = `RSI ${rsi.toFixed(1)} — extreme overbought, koreksi kuat mungkin terjadi`;
  } else if (rsi >= 70) {
    signal = "SELL";
    score = -1;
    explanation = `RSI ${rsi.toFixed(1)} — overbought, waspadai koreksi`;
  } else if (rsi <= 20) {
    signal = "STRONG_BUY";
    score = 2;
    explanation = `RSI ${rsi.toFixed(1)} — extreme oversold, peluang rebound`;
  } else if (rsi <= 30) {
    signal = "BUY";
    score = 1;
    explanation = `RSI ${rsi.toFixed(1)} — oversold, potensi rebound`;
  } else {
    signal = "NEUTRAL";
    score = 0;
    explanation = `RSI ${rsi.toFixed(1)} — netral, tidak ada sinyal extremes`;
  }

  return {
    name: "RSI (14)",
    value: Math.round(rsi * 100) / 100,
    signal,
    score,
    explanation,
  };
}

/**
 * MACD Analysis
 */
function analyzeMACD(prices: StockPrice[]): IndicatorResult {
  const closes = getClosePrices(prices);
  const macdData = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const current = macdData[macdData.length - 1];
  const prev = macdData[macdData.length - 2];

  if (!current) {
    return {
      name: "MACD",
      value: null,
      signal: "NEUTRAL",
      score: 0,
      explanation: "Data MACD tidak cukup",
    };
  }

  const { MACD: macd, signal: signalLine, histogram } = current;
  const prevHist = prev?.histogram ?? 0;

  let signal: Signal;
  let score: number;
  let explanation: string;

  if (macd > signalLine && histogram > 0 && histogram > prevHist) {
    signal = "STRONG_BUY";
    score = 2;
    explanation = `MACD ${macd.toFixed(2)} > Signal ${signalLine.toFixed(2)}, histogram menebal — momentum bullish kuat`;
  } else if (macd > signalLine && histogram > 0) {
    signal = "BUY";
    score = 1;
    explanation = `MACD ${macd.toFixed(2)} di atas Signal — tren naik`;
  } else if (macd < signalLine && histogram < 0 && histogram < prevHist) {
    signal = "STRONG_SELL";
    score = -2;
    explanation = `MACD ${macd.toFixed(2)} < Signal ${signalLine.toFixed(2)}, histogram menebal — momentum bearish kuat`;
  } else if (macd < signalLine && histogram < 0) {
    signal = "SELL";
    score = -1;
    explanation = `MACD ${macd.toFixed(2)} di bawah Signal — tren turun`;
  } else {
    signal = "NEUTRAL";
    score = 0;
    explanation = `MACD & Signal berdekatan, belum ada momentum jelas`;
  }

  return {
    name: "MACD",
    value: Math.round(macd * 10000) / 10000,
    signal,
    score,
    explanation,
  };
}

/**
 * Moving Averages Analysis
 */
function analyzeMovingAverages(prices: StockPrice[]): IndicatorResult {
  const closes = getClosePrices(prices);
  const current = closes[closes.length - 1];

  let score = 0;
  const signals: string[] = [];
  let crossSignal = "";

  // SMA-20
  if (closes.length >= 20) {
    const sma20Values = SMA.calculate({ values: closes, period: 20 });
    const sma20 = sma20Values[sma20Values.length - 1];
    if (sma20 !== undefined) {
      if (current > sma20 * 1.02) {
        signals.push("harga > SMA20");
        score += 0.5;
      } else if (current < sma20 * 0.98) {
        signals.push("harga < SMA20");
        score -= 0.5;
      }
    }
  }

  // SMA-50
  if (closes.length >= 50) {
    const sma50Values = SMA.calculate({ values: closes, period: 50 });
    const sma50 = sma50Values[sma50Values.length - 1];
    if (sma50 !== undefined) {
      if (current > sma50) {
        signals.push("> SMA50");
        score += 0.5;
      } else {
        signals.push("< SMA50");
        score -= 0.5;
      }
    }
  }

  // SMA-200 (long-term)
  if (closes.length >= 200) {
    const sma200Values = SMA.calculate({ values: closes, period: 200 });
    const sma200 = sma200Values[sma200Values.length - 1];
    if (sma200 !== undefined) {
      if (current > sma200) {
        signals.push("> SMA200 (long-term up)");
        score += 1;
      } else {
        signals.push("< SMA200 (long-term down)");
        score -= 1;
      }
    }
  }

  // Golden/Death Cross
  if (closes.length >= 200) {
    const sma50Values = SMA.calculate({ values: closes, period: 50 });
    const sma200Values = SMA.calculate({ values: closes, period: 200 });
    if (sma50Values.length >= 6 && sma200Values.length >= 6) {
      const sma50Now = sma50Values[sma50Values.length - 1];
      const sma200Now = sma200Values[sma200Values.length - 1];
      const sma50Prev = sma50Values[sma50Values.length - 6];
      const sma200Prev = sma200Values[sma200Values.length - 6];

      if (
        sma50Now !== undefined &&
        sma200Now !== undefined &&
        sma50Prev !== undefined &&
        sma200Prev !== undefined
      ) {
        if (sma50Now > sma200Now && sma50Prev <= sma200Prev) {
          crossSignal = " Golden Cross 🟢";
          score += 1.5;
        } else if (sma50Now < sma200Now && sma50Prev >= sma200Prev) {
          crossSignal = " Death Cross 🔴";
          score -= 1.5;
        }
      }
    }
  }

  score = Math.max(-2, Math.min(2, score));

  let signal: Signal;
  if (score >= 1.5) signal = "STRONG_BUY";
  else if (score >= 0.5) signal = "BUY";
  else if (score <= -1.5) signal = "STRONG_SELL";
  else if (score <= -0.5) signal = "SELL";
  else signal = "NEUTRAL";

  const explanation = signals.length > 0
    ? `Harga ${current.toFixed(0)}, MA: ${signals.join(", ")}${crossSignal}`
    : "Moving averages netral";

  return {
    name: "Moving Averages",
    value: Math.round(current),
    signal,
    score,
    explanation,
  };
}

/**
 * Bollinger Bands Analysis
 */
function analyzeBollingerBands(prices: StockPrice[]): IndicatorResult {
  const closes = getClosePrices(prices);
  const bb = BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });

  const current = bb[bb.length - 1];
  if (!current) {
    return {
      name: "Bollinger Bands",
      value: null,
      signal: "NEUTRAL",
      score: 0,
      explanation: "Data BB tidak cukup",
    };
  }

  const { upper, lower, middle } = current;
  const price = closes[closes.length - 1];
  const percentB = (price - lower) / (upper - lower);

  let signal: Signal;
  let score: number;
  let explanation: string;

  if (percentB > 1) {
    signal = "STRONG_SELL";
    score = -2;
    explanation = `%B ${percentB.toFixed(2)} — harga tembus band atas, sangat overbought`;
  } else if (percentB > 0.8) {
    signal = "SELL";
    score = -1;
    explanation = `%B ${percentB.toFixed(2)} — dekat band atas, overbought`;
  } else if (percentB < 0) {
    signal = "STRONG_BUY";
    score = 2;
    explanation = `%B ${percentB.toFixed(2)} — harga tembus band bawah, sangat oversold`;
  } else if (percentB < 0.2) {
    signal = "BUY";
    score = 1;
    explanation = `%B ${percentB.toFixed(2)} — dekat band bawah, oversold`;
  } else {
    signal = "NEUTRAL";
    score = 0;
    explanation = `%B ${percentB.toFixed(2)} — di tengah band, volatilitas normal`;
  }

  return {
    name: "Bollinger Bands",
    value: Math.round(percentB * 100) / 100,
    signal,
    score,
    explanation,
  };
}

/**
 * Stochastic Analysis
 */
function analyzeStochastic(prices: StockPrice[]): IndicatorResult {
  const highs = getHighPrices(prices);
  const lows = getLowPrices(prices);
  const closes = getClosePrices(prices);

  const stoch = Stochastic.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
    signalPeriod: 3,
  });

  const current = stoch[stoch.length - 1];
  if (!current) {
    return {
      name: "Stochastic",
      value: null,
      signal: "NEUTRAL",
      score: 0,
      explanation: "Data Stochastic tidak cukup",
    };
  }

  const { k, d } = current;

  let signal: Signal;
  let score: number;
  let explanation: string;

  if (k > 80 && d > 80) {
    signal = "SELL";
    score = -1;
    explanation = `%K=${k.toFixed(1)}, %D=${d.toFixed(1)} — overbought`;
  } else if (k < 20 && d < 20) {
    signal = "BUY";
    score = 1;
    explanation = `%K=${k.toFixed(1)}, %D=${d.toFixed(1)} — oversold`;
  } else if (k > d && k < 80) {
    signal = "BUY";
    score = 0.5;
    explanation = `%K (${k.toFixed(1)}) > %D (${d.toFixed(1)}) — momentum naik`;
  } else if (k < d && k > 20) {
    signal = "SELL";
    score = -0.5;
    explanation = `%K (${k.toFixed(1)}) < %D (${d.toFixed(1)}) — momentum turun`;
  } else {
    signal = "NEUTRAL";
    score = 0;
    explanation = `%K=${k.toFixed(1)}, %D=${d.toFixed(1)} — netral`;
  }

  return {
    name: "Stochastic",
    value: Math.round(k * 100) / 100,
    signal,
    score,
    explanation,
  };
}

/**
 * Volume Analysis
 */
function analyzeVolume(prices: StockPrice[]): IndicatorResult {
  if (prices.length < 2) {
    return {
      name: "Volume",
      value: null,
      signal: "NEUTRAL",
      score: 0,
      explanation: "Data volume tidak cukup",
    };
  }

  const volumes = getVolumes(prices);
  const closes = getClosePrices(prices);

  // Volume MA-20
  const recent = prices.slice(-20);
  const avgVolume = recent.reduce((sum, p) => sum + p.volume, 0) / recent.length;
  const currentVolume = volumes[volumes.length - 1];
  const volRatio = currentVolume / avgVolume;

  const priceChange = closes[closes.length - 1] - closes[closes.length - 2];

  let signal: Signal;
  let score: number;
  let explanation: string;

  if (volRatio > 2 && priceChange > 0) {
    signal = "STRONG_BUY";
    score = 1.5;
    explanation = `Volume ${volRatio.toFixed(1)}x rata-rata + harga naik — akumulasi kuat`;
  } else if (volRatio > 1.5 && priceChange > 0) {
    signal = "BUY";
    score = 1;
    explanation = `Volume ${volRatio.toFixed(1)}x rata-rata + harga naik`;
  } else if (volRatio > 2 && priceChange < 0) {
    signal = "STRONG_SELL";
    score = -1.5;
    explanation = `Volume ${volRatio.toFixed(1)}x rata-rata + harga turun — distribusi/distress sell`;
  } else if (volRatio > 1.5 && priceChange < 0) {
    signal = "SELL";
    score = -1;
    explanation = `Volume ${volRatio.toFixed(1)}x rata-rata + harga turun`;
  } else if (volRatio < 0.5) {
    signal = "NEUTRAL";
    score = 0;
    explanation = `Volume rendah (${volRatio.toFixed(1)}x) — pasar lesu`;
  } else {
    signal = "NEUTRAL";
    score = 0;
    explanation = `Volume normal (${volRatio.toFixed(1)}x)`;
  }

  return {
    name: "Volume",
    value: Math.round(volRatio * 100) / 100,
    signal,
    score,
    explanation,
  };
}

/**
 * Trend Detection
 */
function detectTrend(prices: StockPrice[]): "Uptrend" | "Downtrend" | "Sideways" {
  const closes = getClosePrices(prices);
  const current = closes[closes.length - 1];
  const bullishCount: string[] = [];

  if (closes.length >= 20) {
    const sma20 = SMA.calculate({ values: closes, period: 20 });
    const last = sma20[sma20.length - 1];
    if (last !== undefined && current > last) bullishCount.push("sma20");
  }

  if (closes.length >= 50) {
    const sma50 = SMA.calculate({ values: closes, period: 50 });
    const last = sma50[sma50.length - 1];
    if (last !== undefined && current > last) bullishCount.push("sma50");
  }

  if (closes.length >= 200) {
    const sma200 = SMA.calculate({ values: closes, period: 200 });
    const last = sma200[sma200.length - 1];
    if (last !== undefined && current > last) bullishCount.push("sma200");
  }

  const total = bullishCount.length;
  if (total >= 2) {
    if (bullishCount.length >= total * 0.7) return "Uptrend";
    if (bullishCount.length <= total * 0.3) return "Downtrend";
  }
  return "Sideways";
}

/**
 * Compute full chart data for visualization
 */
function computeChartData(prices: StockPrice[]) {
  const closes = getClosePrices(prices);
  const n = closes.length;

  // SMA
  const sma20 = SMA.calculate({ values: closes, period: 20 });
  const sma50 = SMA.calculate({ values: closes, period: 50 });
  const sma200 = SMA.calculate({ values: closes, period: 200 });

  // BB
  const bb = BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });

  // RSI
  const rsi = RSI.calculate({ values: closes, period: 14 });

  // MACD
  const macdData = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  // Align all arrays to the same length (n)
  const padStart = (arr: (number | undefined)[], length: number): (number | null)[] => {
    const offset = length - arr.length;
    const result: (number | null)[] = [];
    for (let i = 0; i < offset; i++) result.push(null);
    for (const v of arr) result.push(v === undefined ? null : v);
    return result;
  };

  return {
    sma20: padStart(sma20, n),
    sma50: padStart(sma50, n),
    sma200: padStart(sma200, n),
    bbUpper: padStart(bb.map((b) => b.upper), n),
    bbLower: padStart(bb.map((b) => b.lower), n),
    bbMiddle: padStart(bb.map((b) => b.middle), n),
    rsi: padStart(rsi, n),
    macd: padStart(macdData.map((m) => m.MACD), n),
    macdSignal: padStart(macdData.map((m) => m.signal), n),
    macdHist: padStart(macdData.map((m) => m.histogram), n),
  };
}

/**
 * Main analysis function
 */
export function analyzeTechnical(prices: StockPrice[]): TechnicalAnalysisResult {
  if (prices.length < 30) {
    return {
      indicators: [],
      overallScore: 0,
      overallSignal: "NEUTRAL",
      trend: "Sideways",
      summary: "Data historis tidak cukup untuk analisa teknikal",
      chartData: {
        sma20: [],
        sma50: [],
        sma200: [],
        bbUpper: [],
        bbLower: [],
        bbMiddle: [],
        rsi: [],
        macd: [],
        macdSignal: [],
        macdHist: [],
      },
    };
  }

  const indicators: IndicatorResult[] = [
    analyzeRSI(prices),
    analyzeMACD(prices),
    analyzeMovingAverages(prices),
    analyzeBollingerBands(prices),
    analyzeStochastic(prices),
    analyzeVolume(prices),
  ];

  const scores = indicators.map((i) => i.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const overallScore = Math.round(avgScore * 25 * 100) / 100; // Normalisasi ke -100..+100

  let overallSignal: Signal;
  if (overallScore >= 60) overallSignal = "STRONG_BUY";
  else if (overallScore >= 20) overallSignal = "BUY";
  else if (overallScore <= -60) overallSignal = "STRONG_SELL";
  else if (overallScore <= -20) overallSignal = "SELL";
  else overallSignal = "NEUTRAL";

  const trend = detectTrend(prices);

  const bullish = indicators.filter((i) => i.score > 0).length;
  const bearish = indicators.filter((i) => i.score < 0).length;
  const neutral = indicators.length - bullish - bearish;

  const moodMap: Record<Signal, string> = {
    STRONG_BUY: "sangat bullish",
    BUY: "bullish",
    NEUTRAL: "netral",
    SELL: "bearish",
    STRONG_SELL: "sangat bearish",
  };

  const summary = `Tren saat ini: ${trend}. Sinyal teknikal menunjukkan bias ${moodMap[overallSignal]} (skor ${overallScore.toFixed(1)}/100). Dari ${indicators.length} indikator: ${bullish} bullish, ${bearish} bearish, ${neutral} netral.`;

  return {
    indicators,
    overallScore,
    overallSignal,
    trend,
    summary,
    chartData: computeChartData(prices),
  };
}
