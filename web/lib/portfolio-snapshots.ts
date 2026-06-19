/**
 * Portfolio Snapshots — daily tracking portofolio untuk grafik performa.
 *
 * Snapshot disimpan ke localStorage dengan key "saham_portfolio_snapshots".
 * Tiap snapshot: { date, totalValue, cashBalance, stockValue, totalPL, plPct, netInvested }
 *
 * Save snapshot:
 *   - On portfolio page load
 *   - Hanya jika belum ada snapshot hari ini (avoid duplicate)
 *   - Bisa dipaksa via force = true
 */

import { type Transaction, calculateHoldings } from "@/lib/portfolio";
import {
  type CashEntry,
  calculateCashSummary,
} from "@/lib/cash-ledger";

const SNAPSHOT_KEY = "saham_portfolio_snapshots";

export interface PortfolioSnapshot {
  date: string; // YYYY-MM-DD
  totalValue: number; // cash + stock current value
  cashBalance: number;
  stockValue: number;
  totalCost: number; // active holdings cost basis
  totalPL: number; // realized + unrealized
  plPct: number;
  netInvested: number; // totalTopup - totalWithdraw
  createdAt: string;
}

export function getSnapshots(): PortfolioSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as PortfolioSnapshot[];
  } catch {
    return [];
  }
}

function saveSnapshots(snapshots: PortfolioSnapshot[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots));
}

/**
 * Compute current snapshot value dari transactions + cash + current prices.
 * Pure function — no localStorage side effects.
 */
export function computeCurrentSnapshot(
  transactions: Transaction[],
  cashEntries: CashEntry[],
  currentPrices: Record<string, number>,
): Omit<PortfolioSnapshot, "date" | "createdAt"> {
  const priceMap: Record<string, number> = {};
  for (const [t, p] of Object.entries(currentPrices)) {
    if (typeof p === "number" && Number.isFinite(p)) priceMap[t] = p;
  }

  const holdings = calculateHoldings(transactions, priceMap);
  const cashSummary = calculateCashSummary(cashEntries);

  const stockValue = holdings.reduce(
    (sum, h) => sum + (h.currentValue ?? 0),
    0,
  );
  const totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
  const realizedPL = holdings.reduce((sum, h) => sum + h.realizedPL, 0);
  const unrealizedPL = holdings.reduce(
    (sum, h) => sum + (h.unrealizedPL ?? 0),
    0,
  );
  const totalPL = realizedPL + unrealizedPL;
  const netInvested = cashSummary.totalTopup - cashSummary.totalWithdraw;
  const plPct = netInvested > 0 ? (totalPL / netInvested) * 100 : 0;

  return {
    totalValue: cashSummary.cashBalance + stockValue,
    cashBalance: cashSummary.cashBalance,
    stockValue,
    totalCost,
    totalPL,
    plPct,
    netInvested,
  };
}

/**
 * Save today's snapshot if not already saved.
 * Returns true if a new snapshot was saved.
 */
export function recordTodaySnapshot(
  transactions: Transaction[],
  cashEntries: CashEntry[],
  currentPrices: Record<string, number>,
): { saved: boolean; snapshot: PortfolioSnapshot } {
  const today = new Date().toISOString().split("T")[0];
  const snapshots = getSnapshots();
  const existing = snapshots.find((s) => s.date === today);
  const computed = computeCurrentSnapshot(transactions, cashEntries, currentPrices);

  if (existing) {
    // Overwrite today's snapshot (latest values win)
    const updated: PortfolioSnapshot = {
      ...existing,
      ...computed,
      date: today,
      createdAt: new Date().toISOString(),
    };
    const next = snapshots.map((s) => (s.date === today ? updated : s));
    saveSnapshots(next);
    return { saved: true, snapshot: updated };
  }

  const snap: PortfolioSnapshot = {
    ...computed,
    date: today,
    createdAt: new Date().toISOString(),
  };
  saveSnapshots([...snapshots, snap]);
  return { saved: true, snapshot: snap };
}

export function clearSnapshots(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SNAPSHOT_KEY);
}

/**
 * Aggregate snapshots to fit a chart (max N points).
 * Older data points are averaged together to keep chart readable.
 */
export function aggregateSnapshots(
  snapshots: PortfolioSnapshot[],
  maxPoints = 60,
): PortfolioSnapshot[] {
  if (snapshots.length <= maxPoints) return snapshots;
  const bucketSize = Math.ceil(snapshots.length / maxPoints);
  const result: PortfolioSnapshot[] = [];
  for (let i = 0; i < snapshots.length; i += bucketSize) {
    const bucket = snapshots.slice(i, i + bucketSize);
    if (bucket.length === 0) continue;
    const avg = (key: keyof PortfolioSnapshot) =>
      bucket.reduce((sum, s) => sum + (s[key] as number), 0) / bucket.length;
    result.push({
      date: bucket[bucket.length - 1].date,
      totalValue: avg("totalValue"),
      cashBalance: avg("cashBalance"),
      stockValue: avg("stockValue"),
      totalCost: avg("totalCost"),
      totalPL: avg("totalPL"),
      plPct: avg("plPct"),
      netInvested: avg("netInvested"),
      createdAt: bucket[bucket.length - 1].createdAt,
    });
  }
  return result;
}

export const SNAPSHOT_STORAGE_KEY = SNAPSHOT_KEY;
