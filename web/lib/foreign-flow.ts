/**
 * Foreign Flow Proxy — estimasi net foreign buy/sell berdasarkan data volume.
 */

import { fetchSummary, fetchHistorical } from "@/lib/yahoo";

export interface ForeignFlowStock {
  code: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  avgVolume20d: number;
  volumeRatio: number;
  signal: "FOREIGN_BUY" | "FOREIGN_SELL" | "NEUTRAL";
  score: number;
}

export interface ForeignFlowData {
  netBuy: ForeignFlowStock[];
  netSell: ForeignFlowStock[];
  fetchedAt: string;
  dataSource: string;
}

const POPULAR_TICKERS = [
  "BBCA", "BMRI", "BBRI", "TLKM", "ASII", "UNVR", "ICBP", "INDF",
  "KLBF", "HMSP", "PGAS", "PTBA", "ANTM", "INCO", "SMGR", "JSMR",
  "BSDE", "PWON", "CTRA", "ADRO", "MEDC", "AKRA", "ESSA",
  "BBNI", "BRIS", "BNGA", "BJBR", "ARTO", "BBYB",
  "BMNG", "BRPT", "TPIA", "CHIP",
];

export async function getForeignFlowProxy(): Promise<ForeignFlowData> {
  const results = await Promise.all(
    POPULAR_TICKERS.map(async (ticker): Promise<ForeignFlowStock | null> => {
      try {
        const [summary, historical] = await Promise.all([
          fetchSummary(ticker).catch(() => null),
          fetchHistorical(ticker, "3mo", "1d").catch(() => null),
        ]);
        if (!summary) return null;

        const todayVol = summary.volume ?? 0;
        const prices =
          historical
            ?.map((p) => p.volume)
            .filter((v): v is number => typeof v === "number") ?? [];
        const avgVol20d =
          prices.length > 0
            ? prices.slice(-20).reduce((a, b) => a + b, 0) /
              Math.min(20, prices.length)
            : todayVol;
        const volumeRatio = avgVol20d > 0 ? todayVol / avgVol20d : 1;

        const currentPrice = summary.currentPrice ?? 0;
        const previousClose = summary.previousClose ?? currentPrice;
        const change = currentPrice - previousClose;
        const changePct = previousClose > 0 ? (change / previousClose) * 100 : 0;

        let score = 0;
        if (volumeRatio > 1.0) {
          score = (volumeRatio - 1) * 100;
        }

        let signal: ForeignFlowStock["signal"] = "NEUTRAL";
        if (volumeRatio > 1.5) {
          if (changePct > 0.5) signal = "FOREIGN_BUY";
          else if (changePct < -0.5) signal = "FOREIGN_SELL";
        }

        return {
          code: ticker,
          name: summary.name || ticker,
          sector: summary.sector || "Unknown",
          price: currentPrice,
          change,
          changePct,
          volume: todayVol,
          avgVolume20d: avgVol20d,
          volumeRatio,
          signal,
          score:
            signal === "FOREIGN_BUY"
              ? score
              : signal === "FOREIGN_SELL"
                ? -score
                : 0,
        };
      } catch {
        return null;
      }
    }),
  );

  const stocks = results.filter((r): r is ForeignFlowStock => r !== null);

  const netBuy = stocks
    .filter((s) => s.signal === "FOREIGN_BUY")
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const netSell = stocks
    .filter((s) => s.signal === "FOREIGN_SELL")
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  return {
    netBuy,
    netSell,
    fetchedAt: new Date().toISOString(),
    dataSource:
      "Proxy (volume spike + price action). BUKAN data IDX asli.",
  };
}
