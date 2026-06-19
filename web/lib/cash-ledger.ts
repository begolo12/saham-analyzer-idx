/**
 * Cash Ledger Types & Logic
 * Track top-up & withdraw untuk virtual trading.
 *
 * Modal awal user = total TOPUP - total WITHDRAW.
 * Ini terpisah dari transaksi saham (BUY/SELL).
 */

export type CashEntryType = "TOPUP" | "WITHDRAW";

export interface CashEntry {
  id: string;
  type: CashEntryType;
  amount: number; // Selalu positif (type menentukan arah)
  date: string; // ISO date string YYYY-MM-DD
  notes?: string;
  createdAt: string; // ISO timestamp
}

export interface CashSummary {
  totalTopup: number;
  totalWithdraw: number;
  cashBalance: number; // totalTopup - totalWithdraw
  transactionCount: number;
}

/**
 * Hitung summary cash dari daftar entry.
 */
export function calculateCashSummary(entries: CashEntry[]): CashSummary {
  const totalTopup = entries
    .filter((e) => e.type === "TOPUP")
    .reduce((sum, e) => sum + e.amount, 0);
  const totalWithdraw = entries
    .filter((e) => e.type === "WITHDRAW")
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    totalTopup,
    totalWithdraw,
    cashBalance: totalTopup - totalWithdraw,
    transactionCount: entries.length,
  };
}

/**
 * Generate ID untuk entry baru.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
