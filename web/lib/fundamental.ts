/**
 * Fundamental Analysis - Server-side
 * Menganalisis kesehatan finansial perusahaan.
 *
 * Note: Yahoo Finance untuk saham IDX kadang data fundamental-nya terbatas
 * karena perbedaan reporting standard. Module ini robust terhadap missing data.
 */

import type { StockSummary as StockInfo } from "./yahoo";

export type FundamentalSignal =
  | "EXCELLENT"
  | "GOOD"
  | "FAIR"
  | "POOR"
  | "BAD"
  | "UNKNOWN";

export const FUNDAMENTAL_INDONESIAN: Record<FundamentalSignal, string> = {
  EXCELLENT: "Sangat Baik",
  GOOD: "Baik",
  FAIR: "Cukup",
  POOR: "Buruk",
  BAD: "Sangat Buruk",
  UNKNOWN: "Tidak Diketahui",
};

export const FUNDAMENTAL_SCORE: Record<FundamentalSignal, number> = {
  EXCELLENT: 2,
  GOOD: 1,
  FAIR: 0,
  POOR: -1,
  BAD: -2,
  UNKNOWN: 0,
};

export const FUNDAMENTAL_EMOJI: Record<FundamentalSignal, string> = {
  EXCELLENT: "🌟",
  GOOD: "✅",
  FAIR: "➖",
  POOR: "⚠️",
  BAD: "❌",
  UNKNOWN: "❓",
};

export interface FundamentalMetric {
  name: string;
  value: number | null;
  formatted: string;
  signal: FundamentalSignal;
  score: number;
  explanation: string;
  benchmark: string;
}

export interface FundamentalAnalysisResult {
  metrics: FundamentalMetric[];
  overallScore: number;
  overallSignal: FundamentalSignal;
  dataAvailability: number;
  summary: string;
}

function fmt(value: number | null | undefined, format: "ratio" | "percent" = "ratio"): string {
  if (value === null || value === undefined || isNaN(value)) return "N/A";
  if (format === "percent") {
    return `${(value * 100).toFixed(2)}%`;
  }
  return value.toFixed(2);
}

function safe(value: number | null | undefined): number | null {
  if (value === null || value === undefined || isNaN(value)) return null;
  return value;
}

function makeMetric(
  name: string,
  value: number | null,
  signal: FundamentalSignal,
  score: number,
  explanation: string,
  benchmark: string,
  formatted: string = "N/A",
): FundamentalMetric {
  return {
    name,
    value,
    formatted,
    signal,
    score,
    explanation,
    benchmark,
  };
}

function analyzePE(pe: number | null): FundamentalMetric {
  if (pe === null || pe <= 0) {
    return makeMetric(
      "P/E Ratio (TTM)",
      pe,
      "UNKNOWN",
      0,
      "P/E tidak tersedia atau perusahaan rugi",
      "Standar industri: 10-25",
      "N/A",
    );
  }

  let signal: FundamentalSignal, score: number, explanation: string;
  if (pe < 10) {
    signal = "EXCELLENT";
    score = 2;
    explanation = `P/E ${pe.toFixed(2)} — sangat murah, berpotensi undervalued`;
  } else if (pe < 15) {
    signal = "GOOD";
    score = 1;
    explanation = `P/E ${pe.toFixed(2)} — relatif murah`;
  } else if (pe < 25) {
    signal = "FAIR";
    score = 0;
    explanation = `P/E ${pe.toFixed(2)} — wajar (standar industri)`;
  } else if (pe < 40) {
    signal = "POOR";
    score = -1;
    explanation = `P/E ${pe.toFixed(2)} — mahal, ekspektasi pertumbuhan tinggi`;
  } else {
    signal = "BAD";
    score = -2;
    explanation = `P/E ${pe.toFixed(2)} — sangat mahal atau speculative bubble`;
  }

  return makeMetric(
    "P/E Ratio (TTM)",
    pe,
    signal,
    score,
    explanation,
    "Standar: <15 murah, 15-25 wajar, >25 mahal",
    pe.toFixed(2),
  );
}

function analyzePB(pb: number | null): FundamentalMetric {
  if (pb === null || pb <= 0) {
    return makeMetric(
      "P/B Ratio",
      pb,
      "UNKNOWN",
      0,
      "P/B tidak tersedia",
      "Standar: <1 murah, 1-3 wajar, >3 mahal",
      "N/A",
    );
  }

  let signal: FundamentalSignal, score: number, explanation: string;
  if (pb < 1) {
    signal = "EXCELLENT";
    score = 2;
    explanation = `P/B ${pb.toFixed(2)} — diperdagangkan di bawah nilai buku`;
  } else if (pb < 3) {
    signal = "GOOD";
    score = 1;
    explanation = `P/B ${pb.toFixed(2)} — wajar`;
  } else if (pb < 5) {
    signal = "FAIR";
    score = 0;
    explanation = `P/B ${pb.toFixed(2)} — agak mahal`;
  } else if (pb < 10) {
    signal = "POOR";
    score = -1;
    explanation = `P/B ${pb.toFixed(2)} — mahal`;
  } else {
    signal = "BAD";
    score = -2;
    explanation = `P/B ${pb.toFixed(2)} — sangat mahal`;
  }

  return makeMetric(
    "P/B Ratio",
    pb,
    signal,
    score,
    explanation,
    "Standar: <1 undervalued, 1-3 wajar, >3 mahal",
    pb.toFixed(2),
  );
}

function analyzePS(ps: number | null): FundamentalMetric {
  if (ps === null || ps <= 0) {
    return makeMetric(
      "P/S Ratio",
      ps,
      "UNKNOWN",
      0,
      "P/S tidak tersedia",
      "Standar: <2 murah, 2-5 wajar",
      "N/A",
    );
  }

  let signal: FundamentalSignal, score: number, explanation: string;
  if (ps < 1) {
    signal = "EXCELLENT";
    score = 2;
    explanation = `P/S ${ps.toFixed(2)} — sangat murah`;
  } else if (ps < 3) {
    signal = "GOOD";
    score = 1;
    explanation = `P/S ${ps.toFixed(2)} — wajar`;
  } else if (ps < 6) {
    signal = "FAIR";
    score = 0;
    explanation = `P/S ${ps.toFixed(2)} — agak mahal`;
  } else {
    signal = "POOR";
    score = -1;
    explanation = `P/S ${ps.toFixed(2)} — mahal`;
  }

  return makeMetric(
    "P/S Ratio",
    ps,
    signal,
    score,
    explanation,
    "Standar: <2 murah, 2-5 wajar, >5 mahal",
    ps.toFixed(2),
  );
}

function analyzeROE(roe: number | null): FundamentalMetric {
  if (roe === null) {
    return makeMetric(
      "ROE",
      null,
      "UNKNOWN",
      0,
      "ROE tidak tersedia",
      "Standar: >15% bagus, >20% excellent",
      "N/A",
    );
  }

  const roePct = roe * 100;
  let signal: FundamentalSignal, score: number, explanation: string;
  if (roePct > 20) {
    signal = "EXCELLENT";
    score = 2;
    explanation = `ROE ${roePct.toFixed(1)}% — excellent, perusahaan sangat efisien`;
  } else if (roePct > 15) {
    signal = "GOOD";
    score = 1;
    explanation = `ROE ${roePct.toFixed(1)}% — baik, di atas standar`;
  } else if (roePct > 10) {
    signal = "FAIR";
    score = 0;
    explanation = `ROE ${roePct.toFixed(1)}% — cukup`;
  } else if (roePct > 0) {
    signal = "POOR";
    score = -1;
    explanation = `ROE ${roePct.toFixed(1)}% — rendah, kurang efisien`;
  } else {
    signal = "BAD";
    score = -2;
    explanation = `ROE ${roePct.toFixed(1)}% — negatif, rugi`;
  }

  return makeMetric(
    "ROE",
    roe,
    signal,
    score,
    explanation,
    ">15% bagus, >20% excellent",
    fmt(roe, "percent"),
  );
}

function analyzeROA(roa: number | null): FundamentalMetric {
  if (roa === null) {
    return makeMetric(
      "ROA",
      null,
      "UNKNOWN",
      0,
      "ROA tidak tersedia",
      "Standar: >5% bagus, >10% excellent",
      "N/A",
    );
  }

  const roaPct = roa * 100;
  let signal: FundamentalSignal, score: number, explanation: string;
  if (roaPct > 10) {
    signal = "EXCELLENT";
    score = 2;
    explanation = `ROA ${roaPct.toFixed(1)}% — excellent`;
  } else if (roaPct > 5) {
    signal = "GOOD";
    score = 1;
    explanation = `ROA ${roaPct.toFixed(1)}% — baik`;
  } else if (roaPct > 2) {
    signal = "FAIR";
    score = 0;
    explanation = `ROA ${roaPct.toFixed(1)}% — cukup`;
  } else if (roaPct > 0) {
    signal = "POOR";
    score = -1;
    explanation = `ROA ${roaPct.toFixed(1)}% — rendah`;
  } else {
    signal = "BAD";
    score = -2;
    explanation = `ROA ${roaPct.toFixed(1)}% — negatif`;
  }

  return makeMetric(
    "ROA",
    roa,
    signal,
    score,
    explanation,
    ">5% bagus, >10% excellent",
    fmt(roa, "percent"),
  );
}

function analyzeProfitMargin(margin: number | null): FundamentalMetric {
  if (margin === null) {
    return makeMetric(
      "Profit Margin",
      null,
      "UNKNOWN",
      0,
      "Profit Margin tidak tersedia",
      "Standar: >10% bagus, >20% excellent",
      "N/A",
    );
  }

  const pct = margin * 100;
  let signal: FundamentalSignal, score: number, explanation: string;
  if (pct > 20) {
    signal = "EXCELLENT";
    score = 2;
    explanation = `Margin ${pct.toFixed(1)}% — excellent, pricing power kuat`;
  } else if (pct > 10) {
    signal = "GOOD";
    score = 1;
    explanation = `Margin ${pct.toFixed(1)}% — sehat`;
  } else if (pct > 5) {
    signal = "FAIR";
    score = 0;
    explanation = `Margin ${pct.toFixed(1)}% — cukup`;
  } else if (pct > 0) {
    signal = "POOR";
    score = -1;
    explanation = `Margin ${pct.toFixed(1)}% — tipis, rentan goncangan`;
  } else {
    signal = "BAD";
    score = -2;
    explanation = `Margin ${pct.toFixed(1)}% — negatif`;
  }

  return makeMetric(
    "Profit Margin",
    margin,
    signal,
    score,
    explanation,
    ">10% bagus, >20% excellent",
    fmt(margin, "percent"),
  );
}

function analyzeDER(der: number | null): FundamentalMetric {
  if (der === null) {
    return makeMetric(
      "Debt/Equity",
      null,
      "UNKNOWN",
      0,
      "DER tidak tersedia",
      "Standar: <0.5 konservatif, <1 sehat, >2 berisiko",
      "N/A",
    );
  }

  const derRatio = der > 100 ? der / 100 : der;
  let signal: FundamentalSignal, score: number, explanation: string;
  if (derRatio < 0.3) {
    signal = "EXCELLENT";
    score = 2;
    explanation = `DER ${derRatio.toFixed(2)} — sangat konservatif, hutang rendah`;
  } else if (derRatio < 0.7) {
    signal = "GOOD";
    score = 1;
    explanation = `DER ${derRatio.toFixed(2)} — sehat`;
  } else if (derRatio < 1.5) {
    signal = "FAIR";
    score = 0;
    explanation = `DER ${derRatio.toFixed(2)} — moderat`;
  } else if (derRatio < 2.5) {
    signal = "POOR";
    score = -1;
    explanation = `DER ${derRatio.toFixed(2)} — tinggi, perlu diwaspadai`;
  } else {
    signal = "BAD";
    score = -2;
    explanation = `DER ${derRatio.toFixed(2)} — sangat tinggi, risiko keuangan`;
  }

  return makeMetric(
    "Debt/Equity Ratio",
    derRatio,
    signal,
    score,
    explanation,
    "<0.5 konservatif, <1 sehat, >2 berisiko",
    derRatio.toFixed(2),
  );
}

function analyzeCurrentRatio(cr: number | null): FundamentalMetric {
  if (cr === null) {
    return makeMetric(
      "Current Ratio",
      null,
      "UNKNOWN",
      0,
      "Current Ratio tidak tersedia",
      "Standar: >1.5 sehat, >2 sangat sehat",
      "N/A",
    );
  }

  let signal: FundamentalSignal, score: number, explanation: string;
  if (cr > 2) {
    signal = "EXCELLENT";
    score = 2;
    explanation = `Current Ratio ${cr.toFixed(2)} — sangat likuid`;
  } else if (cr > 1.5) {
    signal = "GOOD";
    score = 1;
    explanation = `Current Ratio ${cr.toFixed(2)} — sehat`;
  } else if (cr > 1) {
    signal = "FAIR";
    score = 0;
    explanation = `Current Ratio ${cr.toFixed(2)} — cukup`;
  } else {
    signal = "BAD";
    score = -2;
    explanation = `Current Ratio ${cr.toFixed(2)} — risiko likuiditas!`;
  }

  return makeMetric(
    "Current Ratio",
    cr,
    signal,
    score,
    explanation,
    ">1.5 sehat, >2 sangat sehat",
    cr.toFixed(2),
  );
}

function analyzeGrowth(growth: number | null, name: string): FundamentalMetric {
  if (growth === null) {
    return makeMetric(
      name,
      null,
      "UNKNOWN",
      0,
      `Pertumbuhan ${name.toLowerCase()} tidak tersedia`,
      "Standar: >10% bagus",
      "N/A",
    );
  }

  const pct = growth * 100;
  let signal: FundamentalSignal, score: number, explanation: string;
  if (pct > 25) {
    signal = "EXCELLENT";
    score = 2;
    explanation = `${name} ${pct.toFixed(1)}% — ekspansi sangat cepat`;
  } else if (pct > 10) {
    signal = "GOOD";
    score = 1;
    explanation = `${name} ${pct.toFixed(1)}% — kuat`;
  } else if (pct > 0) {
    signal = "FAIR";
    score = 0;
    explanation = `${name} ${pct.toFixed(1)}% — moderat`;
  } else {
    signal = "BAD";
    score = -2;
    explanation = `${name} ${pct.toFixed(1)}% — kontraksi`;
  }

  return makeMetric(
    name,
    growth,
    signal,
    score,
    explanation,
    ">10% bagus, >20% sangat bagus",
    fmt(growth, "percent"),
  );
}

function analyzeDividendYield(yieldVal: number | null): FundamentalMetric {
  if (yieldVal === null || yieldVal === 0) {
    return makeMetric(
      "Dividend Yield",
      yieldVal,
      "FAIR",
      0,
      "Tidak membayar dividen atau data tidak tersedia",
      "Standar: >3% bagus, >5% tinggi",
      yieldVal !== null ? fmt(yieldVal, "percent") : "N/A",
    );
  }

  const yieldPct = yieldVal > 1 ? yieldVal : yieldVal * 100;
  let signal: FundamentalSignal, score: number, explanation: string;
  if (yieldPct > 6) {
    signal = "EXCELLENT";
    score = 2;
    explanation = `Yield ${yieldPct.toFixed(2)}% — sangat tinggi`;
  } else if (yieldPct > 4) {
    signal = "GOOD";
    score = 1;
    explanation = `Yield ${yieldPct.toFixed(2)}% — menarik`;
  } else if (yieldPct > 2) {
    signal = "FAIR";
    score = 0;
    explanation = `Yield ${yieldPct.toFixed(2)}% — standar`;
  } else {
    signal = "POOR";
    score = -1;
    explanation = `Yield ${yieldPct.toFixed(2)}% — rendah`;
  }

  return makeMetric(
    "Dividend Yield",
    yieldPct / 100,
    signal,
    score,
    explanation,
    ">3% menarik, >5% tinggi",
    fmt(yieldPct / 100, "percent"),
  );
}

export function analyzeFundamental(info: StockInfo): FundamentalAnalysisResult {
  const earningsGrowth = safe(info.earningsGrowth) ?? safe(info.earningsQuarterlyGrowth);
  const revenueGrowth = safe(info.revenueGrowth) ?? safe(info.revenueQuarterlyGrowth);

  const metrics: FundamentalMetric[] = [
    analyzePE(safe(info.trailingPE) ?? safe(info.forwardPE)),
    analyzePB(safe(info.priceToBook)),
    analyzePS(safe(info.priceToSalesTrailing12Months)),
    analyzeROE(safe(info.returnOnEquity)),
    analyzeROA(safe(info.returnOnAssets)),
    analyzeProfitMargin(safe(info.profitMargins)),
    analyzeDER(safe(info.debtToEquity)),
    analyzeCurrentRatio(safe(info.currentRatio)),
    analyzeGrowth(earningsGrowth, "Earnings Growth"),
    analyzeGrowth(revenueGrowth, "Revenue Growth"),
    analyzeDividendYield(safe(info.dividendYield) ?? safe(info.trailingAnnualDividendYield)),
  ];

  const available = metrics.filter((m) => m.signal !== "UNKNOWN");
  const dataAvailability = available.length / metrics.length;
  const avgScore = available.length > 0
    ? available.reduce((sum, m) => sum + m.score, 0) / available.length
    : 0;
  const overallScore = Math.round(avgScore * 25 * 100) / 100;

  let overallSignal: FundamentalSignal;
  if (overallScore >= 60) overallSignal = "EXCELLENT";
  else if (overallScore >= 20) overallSignal = "GOOD";
  else if (overallScore <= -60) overallSignal = "BAD";
  else if (overallScore <= -20) overallSignal = "POOR";
  else overallSignal = "FAIR";

  let summary: string;
  if (dataAvailability < 0.3) {
    summary = `⚠️ Data fundamental sangat terbatas untuk saham IDX ini (hanya ${(dataAvailability * 100).toFixed(0)}% tersedia). Disarankan cek langsung ke website IDX atau laporan keuangan perusahaan.`;
  } else {
    const moodMap: Record<FundamentalSignal, string> = {
      EXCELLENT: "sangat kuat secara fundamental",
      GOOD: "sehat secara fundamental",
      FAIR: "cukup fundamental, tidak istimewa",
      POOR: "lemah secara fundamental",
      BAD: "sangat buruk secara fundamental",
      UNKNOWN: "tidak cukup data untuk dinilai",
    };
    const highlights = available
      .filter((m) => Math.abs(m.score) >= 1)
      .slice(0, 3)
      .map((m) =>
        m.score >= 1
          ? `✓ ${m.name} (${m.formatted}) — positif`
          : `⚠ ${m.name} (${m.formatted}) — perhatian`,
      )
      .join("\n");

    summary = `Perusahaan **${moodMap[overallSignal]}** (skor ${overallScore.toFixed(1)}/100, ${(dataAvailability * 100).toFixed(0)}% data tersedia).\n\n${highlights ? "Highlights:\n" + highlights : "Tidak ada sorotan khusus"}`;
  }

  return {
    metrics,
    overallScore,
    overallSignal,
    dataAvailability,
    summary,
  };
}
