/**
 * Self-Analysis System
 * Sistem yang track performa rekomendasi dan belajar dari kesalahan.
 *
 * Cara kerja:
 * 1. Setiap kali user buka halaman analisa saham, kita record:
 *    - ticker, action, confidence, components scores, price saat itu
 * 2. Periodically (saat user buka app), kita cek harga saat ini
 * 3. Hitung outcome (WIN/LOSS/NEUTRAL) berdasarkan action vs actual price movement
 * 4. Akumulasi statistics per action type, per signal strength
 * 5. Tampilkan "System Health" metrics + rekomendasi weight adjustment
 *
 * Outcome criteria:
 * - BUY: WIN jika price naik >2% dalam tracking window
 *       LOSS jika price turun >2%
 *       NEUTRAL jika |change| < 2%
 * - SELL: kebalikan
 * - HOLD: WIN jika |change| < 3% (tidak volatile)
 *        LOSS jika |change| > 5% (bisa beli/jual lebih profitable)
 */

export type TrackedAction = "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";

export interface RecommendationRecord {
  id: string;
  ticker: string;
  action: TrackedAction;
  confidence: number;
  componentScores: {
    technical: number;
    fundamental: number;
    behavioral: number;
    sentiment: number;
  };
  weights: {
    technical: number;
    fundamental: number;
    behavioral: number;
    sentiment: number;
  };
  entryPrice: number;
  recordedAt: string; // ISO timestamp
  checkAt: string; // Kapan kita cek hasilnya
  currentPrice?: number;
  outcome?: OutcomeResult;
  // User feedback (optional)
  userFeedback?: "correct" | "wrong" | null;
  userNote?: string;
}

export interface OutcomeResult {
  priceChange: number; // current - entry
  priceChangePct: number;
  status: "WIN" | "LOSS" | "NEUTRAL";
  correct: boolean; // Apakah rekomendasi terbukti benar
  checkedAt: string;
}

export interface PerformanceStats {
  total: number;
  wins: number;
  losses: number;
  neutral: number;
  winRate: number; // %
  avgReturn: number; // % average across all
  bestTrade: { ticker: string; return: number } | null;
  worstTrade: { ticker: string; return: number } | null;
}

export interface SignalAccuracy {
  technical: { winRate: number; count: number };
  fundamental: { winRate: number; count: number };
  behavioral: { winRate: number; count: number };
  sentiment: { winRate: number; count: number };
}

export interface SuggestedWeights {
  technical: number;
  fundamental: number;
  behavioral: number;
  sentiment: number;
  // Alasan perubahan
  reason: string;
}

export interface SystemHealth {
  totalRecommendations: number;
  trackedOutcomes: number;
  overallAccuracy: number;
  perActionStats: Record<TrackedAction, PerformanceStats>;
  signalAccuracy: SignalAccuracy;
  suggestedWeights: SuggestedWeights;
  calibration: {
    highConfidenceAccuracy: number; // Win rate saat confidence >= 70%
    lowConfidenceAccuracy: number; // Win rate saat confidence < 40%
    calibrationScore: number; // 0-100, seberapa well-calibrated
  };
  // Detect if the system is biased toward certain signals
  bias: {
    overweighted: "technical" | "fundamental" | "behavioral" | "sentiment" | null;
    underweighted: "technical" | "fundamental" | "behavioral" | "sentiment" | null;
    description: string;
  };
}

/**
 * Generate unique ID
 */
export function generateRecordId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Tentukan outcome dari price change berdasarkan action
 */
export function calculateOutcome(
  action: TrackedAction,
  entryPrice: number,
  currentPrice: number,
): OutcomeResult {
  const priceChange = currentPrice - entryPrice;
  const priceChangePct = (priceChange / entryPrice) * 100;

  let status: OutcomeResult["status"];
  let correct: boolean;

  const absChange = Math.abs(priceChangePct);

  switch (action) {
    case "STRONG_BUY":
    case "BUY":
      if (priceChangePct > 2) {
        status = "WIN";
        correct = true;
      } else if (priceChangePct < -2) {
        status = "LOSS";
        correct = false;
      } else {
        status = "NEUTRAL";
        correct = true; // Tidak salah, tapi tidak significant
      }
      break;
    case "STRONG_SELL":
    case "SELL":
      if (priceChangePct < -2) {
        status = "WIN";
        correct = true;
      } else if (priceChangePct > 2) {
        status = "LOSS";
        correct = false;
      } else {
        status = "NEUTRAL";
        correct = true;
      }
      break;
    case "HOLD":
      if (absChange < 3) {
        status = "WIN";
        correct = true;
      } else if (absChange > 5) {
        status = "LOSS";
        correct = false;
      } else {
        status = "NEUTRAL";
        correct = true;
      }
      break;
  }

  return {
    priceChange,
    priceChangePct: Math.round(priceChangePct * 100) / 100,
    status,
    correct,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Calculate performance stats for given records
 */
export function calculatePerformanceStats(
  records: RecommendationRecord[],
): PerformanceStats {
  const withOutcomes = records.filter((r) => r.outcome);

  if (withOutcomes.length === 0) {
    return {
      total: 0,
      wins: 0,
      losses: 0,
      neutral: 0,
      winRate: 0,
      avgReturn: 0,
      bestTrade: null,
      worstTrade: null,
    };
  }

  const wins = withOutcomes.filter((r) => r.outcome?.status === "WIN").length;
  const losses = withOutcomes.filter((r) => r.outcome?.status === "LOSS").length;
  const neutral = withOutcomes.length - wins - losses;
  const winRate = (wins / withOutcomes.length) * 100;
  const avgReturn =
    withOutcomes.reduce((sum, r) => sum + (r.outcome?.priceChangePct ?? 0), 0) /
    withOutcomes.length;

  let bestTrade: PerformanceStats["bestTrade"] = null;
  let worstTrade: PerformanceStats["worstTrade"] = null;

  for (const r of withOutcomes) {
    if (!r.outcome) continue;
    if (!bestTrade || r.outcome.priceChangePct > bestTrade.return) {
      bestTrade = { ticker: r.ticker, return: r.outcome.priceChangePct };
    }
    if (!worstTrade || r.outcome.priceChangePct < worstTrade.return) {
      worstTrade = { ticker: r.ticker, return: r.outcome.priceChangePct };
    }
  }

  return {
    total: withOutcomes.length,
    wins,
    losses,
    neutral,
    winRate: Math.round(winRate * 10) / 10,
    avgReturn: Math.round(avgReturn * 100) / 100,
    bestTrade,
    worstTrade,
  };
}

/**
 * Hitung akurasi per signal (technical, fundamental, dll)
 * Logika: untuk setiap record, cek apakah sinyal dengan score tertinggi terbukti benar
 */
export function calculateSignalAccuracy(
  records: RecommendationRecord[],
): SignalAccuracy {
  const signals = ["technical", "fundamental", "behavioral", "sentiment"] as const;
  const result: SignalAccuracy = {
    technical: { winRate: 0, count: 0 },
    fundamental: { winRate: 0, count: 0 },
    behavioral: { winRate: 0, count: 0 },
    sentiment: { winRate: 0, count: 0 },
  };

  for (const signal of signals) {
    // Records where this signal had the strongest influence
    // (highest absolute score contribution = score * weight)
    const relevantRecords = records.filter((r) => {
      if (!r.outcome) return false;
      const contributions = signals.map((s) => ({
        signal: s,
        contribution: Math.abs(r.componentScores[s] * r.weights[s]),
      }));
      const top = contributions.reduce((max, c) => (c.contribution > max.contribution ? c : max));
      return top.signal === signal;
    });

    if (relevantRecords.length === 0) continue;

    const wins = relevantRecords.filter((r) => r.outcome?.correct).length;
    result[signal] = {
      winRate: Math.round((wins / relevantRecords.length) * 1000) / 10,
      count: relevantRecords.length,
    };
  }

  return result;
}

/**
 * Detect bias dan recommend weight adjustments
 */
export function detectBias(
  signalAccuracy: SignalAccuracy,
  currentWeights: Record<string, number>,
): SystemHealth["bias"] {
  const signals = ["technical", "fundamental", "behavioral", "sentiment"] as const;

  let best: typeof signals[number] | null = null;
  let worst: typeof signals[number] | null = null;
  let bestWinRate = 0;
  let worstWinRate = 100;

  for (const sig of signals) {
    const acc = signalAccuracy[sig];
    if (acc.count < 3) continue; // Not enough data
    if (acc.winRate > bestWinRate) {
      bestWinRate = acc.winRate;
      best = sig;
    }
    if (acc.winRate < worstWinRate) {
      worstWinRate = acc.winRate;
      worst = sig;
    }
  }

  if (!best || !worst || best === worst) {
    return {
      overweighted: null,
      underweighted: null,
      description: "Belum cukup data untuk detect bias. Track lebih banyak rekomendasi.",
    };
  }

  const bestWeight = currentWeights[best] ?? 0.3;
  const worstWeight = currentWeights[worst] ?? 0.3;

  let description = "";
  let overweighted: SystemHealth["bias"]["overweighted"] = null;
  let underweighted: SystemHealth["bias"]["underweighted"] = null;

  // Jika signal terbaik punya bobot lebih kecil dari yang terburuk, itu bias
  if (bestWeight < worstWeight && bestWinRate - worstWinRate > 10) {
    overweighted = worst;
    underweighted = best;
    description = `${worst.toUpperCase()} overrated (weight ${(worstWeight*100).toFixed(0)}%, win rate ${worstWinRate}%) vs ${best.toUpperCase()} underrated (weight ${(bestWeight*100).toFixed(0)}%, win rate ${bestWinRate}%). Sistem akan auto-adjust.`;
  } else if (bestWinRate - worstWinRate > 15) {
    description = `${best.toUpperCase()} lebih akurat (${bestWinRate}%) dari ${worst.toUpperCase()} (${worstWinRate}%). Pertimbangkan menyesuaikan bobot.`;
  } else {
    description = "Bobot sinyal relatif seimbang. Lanjutkan tracking.";
  }

  return { overweighted, underweighted, description };
}

/**
 * Calculate suggested weights berdasarkan historical performance
 */
export function calculateSuggestedWeights(
  signalAccuracy: SignalAccuracy,
  currentWeights: Record<string, number>,
): SuggestedWeights {
  const signals = ["technical", "fundamental", "behavioral", "sentiment"] as const;

  // Minimum sample size
  const minSamples = 5;
  const totalSamples = signals.reduce(
    (sum, s) => sum + signalAccuracy[s].count,
    0,
  );

  if (totalSamples < minSamples * 4) {
    return {
      technical: currentWeights.technical,
      fundamental: currentWeights.fundamental,
      behavioral: currentWeights.behavioral,
      sentiment: currentWeights.sentiment,
      reason: `Belum cukup data (${totalSamples} dari ${minSamples * 4} minimum). Track lebih banyak rekomendasi.`,
    };
  }

  // Weight by win rate
  const totalWR = signals.reduce((sum, s) => sum + signalAccuracy[s].winRate, 0);

  if (totalWR === 0) {
    return {
      technical: currentWeights.technical,
      fundamental: currentWeights.fundamental,
      behavioral: currentWeights.behavioral,
      sentiment: currentWeights.sentiment,
      reason: "Win rate masih rendah, pertahankan bobot saat ini.",
    };
  }

  const rawWeights = signals.reduce(
    (acc, s) => {
      acc[s] = signalAccuracy[s].winRate / totalWR;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Apply momentum: blend 60% historical + 40% current (to avoid abrupt changes)
  const blend = 0.4;
  const blended = signals.reduce(
    (acc, s) => {
      acc[s] = (1 - blend) * rawWeights[s] + blend * (currentWeights[s] ?? 0.25);
      return acc;
    },
    {} as Record<string, number>,
  );

  // Normalize to sum = 1
  const sum = Object.values(blended).reduce((a, b) => a + b, 0);
  const normalized = signals.reduce(
    (acc, s) => {
      acc[s] = blended[s] / sum;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    technical: Math.round(normalized.technical * 1000) / 1000,
    fundamental: Math.round(normalized.fundamental * 1000) / 1000,
    behavioral: Math.round(normalized.behavioral * 1000) / 1000,
    sentiment: Math.round(normalized.sentiment * 1000) / 1000,
    reason: `Berdasarkan ${totalSamples} tracked outcomes. Blended 60% historical win rate + 40% current weight untuk stabilitas.`,
  };
}

/**
 * Calculate calibration score (seberapa well-calibrated confidence)
 */
export function calculateCalibration(
  records: RecommendationRecord[],
): SystemHealth["calibration"] {
  const withOutcomes = records.filter((r) => r.outcome);

  const high = withOutcomes.filter((r) => r.confidence >= 70);
  const low = withOutcomes.filter((r) => r.confidence < 40);

  const highWin = high.length > 0
    ? (high.filter((r) => r.outcome?.correct).length / high.length) * 100
    : 0;
  const lowWin = low.length > 0
    ? (low.filter((r) => r.outcome?.correct).length / low.length) * 100
    : 0;

  // Calibration score: high confidence should have higher win rate
  // Perfect calibration: high_conf >= 70% win, low_conf <= 40% win
  let calibrationScore = 50;

  if (high.length >= 3 && low.length >= 3) {
    const gap = highWin - lowWin;
    // Gap should ideally be > 30% points
    calibrationScore = Math.max(0, Math.min(100, 50 + gap));
  } else if (high.length >= 3) {
    // Only have high-confidence data
    calibrationScore = highWin >= 60 ? 70 : highWin >= 40 ? 50 : 30;
  }

  return {
    highConfidenceAccuracy: Math.round(highWin * 10) / 10,
    lowConfidenceAccuracy: Math.round(lowWin * 10) / 10,
    calibrationScore: Math.round(calibrationScore),
  };
}

/**
 * Compute full system health
 */
export function calculateSystemHealth(
  records: RecommendationRecord[],
  currentWeights: Record<string, number>,
): SystemHealth {
  const withOutcomes = records.filter((r) => r.outcome);
  const overallCorrect = withOutcomes.filter((r) => r.outcome?.correct).length;
  const overallAccuracy =
    withOutcomes.length > 0
      ? Math.round((overallCorrect / withOutcomes.length) * 1000) / 10
      : 0;

  // Per-action stats
  const perActionStats: Record<TrackedAction, PerformanceStats> = {
    STRONG_BUY: calculatePerformanceStats(records.filter((r) => r.action === "STRONG_BUY")),
    BUY: calculatePerformanceStats(records.filter((r) => r.action === "BUY")),
    HOLD: calculatePerformanceStats(records.filter((r) => r.action === "HOLD")),
    SELL: calculatePerformanceStats(records.filter((r) => r.action === "SELL")),
    STRONG_SELL: calculatePerformanceStats(records.filter((r) => r.action === "STRONG_SELL")),
  };

  const signalAccuracy = calculateSignalAccuracy(records);
  const bias = detectBias(signalAccuracy, currentWeights);
  const suggestedWeights = calculateSuggestedWeights(signalAccuracy, currentWeights);
  const calibration = calculateCalibration(records);

  return {
    totalRecommendations: records.length,
    trackedOutcomes: withOutcomes.length,
    overallAccuracy,
    perActionStats,
    signalAccuracy,
    suggestedWeights,
    calibration,
    bias,
  };
}

/**
 * Auto-update outcomes for records that are due to be checked
 */
export function updateOutcomes(
  records: RecommendationRecord[],
  currentPrices: Record<string, number>,
): RecommendationRecord[] {
  return records.map((r) => {
    // Skip if already has outcome or user gave feedback
    if (r.outcome || r.userFeedback) return r;

    const checkTime = new Date(r.checkAt).getTime();
    const now = Date.now();
    if (now < checkTime) return r; // Not yet time to check

    const price = currentPrices[r.ticker];
    if (price === undefined) return r;

    const outcome = calculateOutcome(r.action, r.entryPrice, price);
    return { ...r, currentPrice: price, outcome };
  });
}
