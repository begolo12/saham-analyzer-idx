/**
 * Recommendation Engine
 * Menggabungkan semua sinyal (teknikal, fundamental, behavioral, sentimen)
 * menjadi rekomendasi Buy/Hold/Sell dengan timeframe.
 */

import type { Signal } from "./technical";
import type { FundamentalSignal } from "./fundamental";
import type { BehavioralSignal } from "./behavioral";
import type { SentimentLabel } from "./sentiment";

export type Action = "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
export type TimeHorizon = "SHORT" | "MEDIUM" | "LONG";

export const ACTION_INDONESIAN: Record<Action, string> = {
  STRONG_BUY: "BELI KUAT",
  BUY: "BELI",
  HOLD: "TAHAN",
  SELL: "JUAL",
  STRONG_SELL: "JUAL KUAT",
};

export const ACTION_EMOJI: Record<Action, string> = {
  STRONG_BUY: "🟢🟢",
  BUY: "🟢",
  HOLD: "🟡",
  SELL: "🔴",
  STRONG_SELL: "🔴🔴",
};

export const ACTION_COLOR: Record<Action, string> = {
  STRONG_BUY: "#00C853",
  BUY: "#4CAF50",
  HOLD: "#FFA726",
  SELL: "#F44336",
  STRONG_SELL: "#B71C1C",
};

export const HORIZON_INDONESIAN: Record<TimeHorizon, string> = {
  SHORT: "Jangka Pendek (1-7 hari)",
  MEDIUM: "Jangka Menengah (1-4 minggu)",
  LONG: "Jangka Panjang (1-6 bulan)",
};

export interface Recommendation {
  action: Action;
  confidence: number;
  horizon: TimeHorizon;
  currentPrice: number | null;
  entryZone: [number, number] | null;
  targetPrice: number | null;
  stopLoss: number | null;
  riskRewardRatio: number | null;
  reasoning: string;
  warnings: string[];
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
}

export interface RecommenderInputs {
  technical?: { overallScore: number; overallSignal: Signal; trend: string; summary: string };
  fundamental?: { overallScore: number; overallSignal: FundamentalSignal; dataAvailability: number; summary: string };
  behavioral?: { overallScore: number; overallSignal: BehavioralSignal; summary: string };
  sentiment?: { overallScore: number; overallLabel: SentimentLabel; confidence: number; summary: string; articles?: unknown[] };
  currentPrice?: number | null;
}

const DEFAULT_WEIGHTS = {
  technical: 0.30,
  fundamental: 0.30,
  behavioral: 0.25,
  sentiment: 0.15,
};

function scoreToAction(score: number): Action {
  if (score >= 50) return "STRONG_BUY";
  if (score >= 15) return "BUY";
  if (score <= -50) return "STRONG_SELL";
  if (score <= -15) return "SELL";
  return "HOLD";
}

function determineHorizon(
  weights: Record<string, number>,
  scores: Record<string, number>,
): TimeHorizon {
  const w = {
    technical: weights.technical,
    fundamental: weights.fundamental,
    behavioral: weights.behavioral,
    sentiment: weights.sentiment,
  };

  const max = Math.max(w.technical, w.fundamental, w.behavioral, w.sentiment);

  if (w.fundamental === max && w.fundamental > 0.3) return "LONG";
  if (w.behavioral === max && w.behavioral > 0.25) return "MEDIUM";
  return "SHORT";
}

function calculateConfidence(
  score: number,
  availabilities: Record<string, number>,
  action: Action,
): number {
  const baseConf = Math.min(100, Math.abs(score) * 1.2);
  const avgAvail =
    (availabilities.technical +
      availabilities.fundamental +
      availabilities.behavioral +
      availabilities.sentiment) /
    4;
  let confidence = baseConf * avgAvail;
  if (action === "HOLD") confidence = Math.min(confidence, 50);
  return Math.max(0, Math.min(100, confidence));
}

function calculatePriceTargets(
  action: Action,
  horizon: TimeHorizon,
  currentPrice: number | null | undefined,
): { entryZone: [number, number] | null; target: number | null; stopLoss: number | null; rr: number | null } {
  if (!currentPrice || currentPrice === 0) {
    return { entryZone: null, target: null, stopLoss: null, rr: null };
  }

  let move: number, stop: number;
  if (horizon === "SHORT") {
    move = 0.05;
    stop = 0.03;
  } else if (horizon === "MEDIUM") {
    move = 0.10;
    stop = 0.05;
  } else {
    move = 0.20;
    stop = 0.10;
  }

  if (action === "BUY" || action === "STRONG_BUY") {
    const entryZone: [number, number] = [currentPrice * (1 - stop / 2), currentPrice * (1 + 0.01)];
    const target = currentPrice * (1 + move);
    const stopLoss = currentPrice * (1 - stop);
    const rr = (target - currentPrice) / Math.max(currentPrice - stopLoss, 0.01);
    return { entryZone, target, stopLoss, rr };
  }

  if (action === "SELL" || action === "STRONG_SELL") {
    const entryZone: [number, number] = [currentPrice * (1 - 0.01), currentPrice * (1 + stop / 2)];
    const target = currentPrice * (1 - move);
    const stopLoss = currentPrice * (1 + stop);
    const rr = (currentPrice - target) / Math.max(stopLoss - currentPrice, 0.01);
    return { entryZone, target, stopLoss, rr };
  }

  // HOLD
  return {
    entryZone: [currentPrice * 0.97, currentPrice * 1.03],
    target: null,
    stopLoss: currentPrice * 0.92,
    rr: null,
  };
}

export function generateRecommendation(inputs: RecommenderInputs): Recommendation {
  const scores = {
    technical: inputs.technical?.overallScore ?? 0,
    fundamental: inputs.fundamental?.overallScore ?? 0,
    behavioral: inputs.behavioral?.overallScore ?? 0,
    sentiment: inputs.sentiment?.overallScore ?? 0,
  };

  const availabilities = {
    technical: inputs.technical ? 1.0 : 0.0,
    fundamental: inputs.fundamental?.dataAvailability ?? 0.0,
    behavioral: inputs.behavioral ? 1.0 : 0.0,
    sentiment: inputs.sentiment?.confidence ?? 0.0,
  };

  // Adjust weights by availability
  const adjusted: Record<string, number> = {};
  let total = 0;
  for (const [key, baseW] of Object.entries(DEFAULT_WEIGHTS)) {
    const adj = baseW * (availabilities[key as keyof typeof availabilities] || 0);
    adjusted[key] = adj;
    total += adj;
  }
  const weights: Record<string, number> = {};
  if (total > 0) {
    for (const [k, v] of Object.entries(adjusted)) weights[k] = v / total;
  } else {
    Object.assign(weights, DEFAULT_WEIGHTS);
  }

  // Weighted score
  const weightedScore =
    scores.technical * weights.technical +
    scores.fundamental * weights.fundamental +
    scores.behavioral * weights.behavioral +
    scores.sentiment * weights.sentiment;

  const action = scoreToAction(weightedScore);
  const horizon = determineHorizon(weights, scores);
  const confidence = calculateConfidence(weightedScore, availabilities, action);

  const { entryZone, target, stopLoss, rr } = calculatePriceTargets(
    action,
    horizon,
    inputs.currentPrice,
  );

  // Reasoning
  const moodMap: Record<Action, string> = {
    STRONG_BUY: "sangat positif, sinyal beli kuat",
    BUY: "positif, ada peluang beli",
    HOLD: "netral, belum ada sinyal jelas",
    SELL: "negatif, ada risiko jual",
    STRONG_SELL: "sangat negatif, sinyal jual kuat",
  };

  const lines: string[] = [];
  lines.push(`**Rekomendasi: ${ACTION_INDONESIAN[action]}** — ${moodMap[action]} (skor total ${weightedScore >= 0 ? "+" : ""}${weightedScore.toFixed(1)}/100)`);
  lines.push(`\n**Horizon:** ${HORIZON_INDONESIAN[horizon]}`);
  lines.push(`\n**Breakdown Sinyal:**\n`);

  const labels = {
    technical: "📊 Teknikal",
    fundamental: "💼 Fundamental",
    behavioral: "🔍 Behavioral Pattern",
    sentiment: "📰 Sentimen Berita",
  };

  for (const key of ["technical", "fundamental", "behavioral", "sentiment"] as const) {
    const w = weights[key] * 100;
    const s = scores[key];
    const sign = s >= 0 ? "+" : "";
    lines.push(`- ${labels[key]} (bobot ${w.toFixed(0)}%): **${sign}${s.toFixed(1)}/100**`);
  }

  // Insights
  lines.push(`\n**Insight Utama:**\n`);
  if (inputs.technical) lines.push(`- **Teknikal:** ${inputs.technical.summary}`);
  if (inputs.fundamental && (inputs.fundamental.dataAvailability ?? 0) > 0.2) {
    lines.push(`- **Fundamental:** ${inputs.fundamental.summary}`);
  }
  if (inputs.behavioral) lines.push(`- **Behavioral:** ${inputs.behavioral.summary}`);
  if (inputs.sentiment) lines.push(`- **Sentimen:** ${inputs.sentiment.summary}`);

  // Warnings
  const warnings: string[] = [];
  warnings.push("⚠️ Rekomendasi ini adalah hasil analisa kuantitatif, BUKAN saran finansial. Selalu lakukan riset sendiri (DYOR).");

  if (confidence < 40) {
    warnings.push("⚠️ Confidence rendah — sinyal saling bertentangan, kurangi ukuran posisi atau tunggu konfirmasi.");
  }

  if ((inputs.fundamental?.dataAvailability ?? 0) < 0.3) {
    warnings.push("ℹ️ Data fundamental terbatas untuk saham IDX ini. Cek langsung laporan keuangan di idx.co.id untuk validasi.");
  }

  if ((inputs.sentiment?.confidence ?? 0) < 0.3) {
    warnings.push("ℹ️ Sedikit berita terbaru yang berhasil di-fetch. Sentimen mungkin tidak representatif.");
  }

  return {
    action,
    confidence: Math.round(confidence * 10) / 10,
    horizon,
    currentPrice: inputs.currentPrice ?? null,
    entryZone,
    targetPrice: target,
    stopLoss,
    riskRewardRatio: rr,
    reasoning: lines.join("\n"),
    warnings,
    componentScores: scores,
    weights: {
      technical: weights.technical,
      fundamental: weights.fundamental,
      behavioral: weights.behavioral,
      sentiment: weights.sentiment,
    },
  };
}
