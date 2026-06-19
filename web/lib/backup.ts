/**
 * Backup & Restore — export semua data portfolio ke JSON file,
 * dan restore dari file JSON ke localStorage.
 *
 * Meliputi:
 *   - Watchlist (dengan metadata viewCount, lastViewed)
 *   - Portfolio transactions
 *   - Cash ledger (topup/withdraw)
 *   - Portfolio snapshots (untuk grafik performa)
 *   - Price alerts (untuk notifikasi target)
 */

const STORAGE_KEYS = {
  watchlist: "saham_watchlist",
  portfolio: "saham_portfolio",
  cash: "saham_cash_ledger",
  snapshots: "saham_portfolio_snapshots",
  alerts: "saham_price_alerts",
  selfAnalysis: "saham_self_analysis",
  notifications: "saham_notifications_enabled",
  peakPrices: "saham_peak_prices",
  ihsgCache: "saham_ihsg_cache",
} as const;

/** All keys managed by backup/reset (everything app-specific) */
export const ALL_STORAGE_KEYS = Object.values(STORAGE_KEYS);

export interface BackupData {
  version: number;
  exportedAt: string;
  watchlist: unknown;
  portfolio: unknown;
  cash: unknown;
  snapshots: unknown;
  alerts: unknown;
}

export const BACKUP_VERSION = 1;

export function exportAll(): BackupData {
  if (typeof window === "undefined") {
    throw new Error("exportAll hanya berjalan di browser");
  }
  const data: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    watchlist: readJSON(STORAGE_KEYS.watchlist),
    portfolio: readJSON(STORAGE_KEYS.portfolio),
    cash: readJSON(STORAGE_KEYS.cash),
    snapshots: readJSON(STORAGE_KEYS.snapshots),
    alerts: readJSON(STORAGE_KEYS.alerts),
  };
  return data;
}

export function importAll(data: unknown, opts: { merge?: boolean } = {}): {
  imported: string[];
  skipped: string[];
} {
  if (typeof window === "undefined") {
    throw new Error("importAll hanya berjalan di browser");
  }
  const validated = validateBackup(data);
  if (!validated.ok) {
    throw new Error(`Backup tidak valid: ${validated.error}`);
  }
  const backup = validated.data;
  const imported: string[] = [];
  const skipped: string[] = [];

  // Helper: write key
  const write = (key: keyof typeof STORAGE_KEYS, value: unknown) => {
    if (value === undefined) return;
    if (value === null) {
      localStorage.removeItem(STORAGE_KEYS[key]);
      skipped.push(key);
      return;
    }
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
    imported.push(key);
  };

  if (opts.merge) {
    // Merge: gabung existing dengan imported, imported wins on duplicate IDs
    Object.entries(backup).forEach(([k, v]) => {
      if (k === "version" || k === "exportedAt") return;
      if (v === undefined || v === null) return;
      const existing = readJSON(STORAGE_KEYS[k as keyof typeof STORAGE_KEYS]);
      const merged = mergeData(k, existing, v);
      write(k as keyof typeof STORAGE_KEYS, merged);
    });
  } else {
    // Replace: timpa semua
    Object.entries(backup).forEach(([k, v]) => {
      if (k === "version" || k === "exportedAt") return;
      write(k as keyof typeof STORAGE_KEYS, v);
    });
  }

  // Notify all subscribers
  window.dispatchEvent(new CustomEvent("portfolio-updated"));
  window.dispatchEvent(new CustomEvent("watchlist-updated"));

  return { imported, skipped };
}

export function exportToFile(filename = "saham-backup.json"): void {
  const data = exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importFromFile(file: File): Promise<{
  imported: string[];
  skipped: string[];
}> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("File bukan JSON yang valid");
  }
  return importAll(parsed);
}

export function getBackupStats(): {
  watchlistCount: number;
  portfolioCount: number;
  cashCount: number;
  snapshotCount: number;
  alertCount: number;
  sizeBytes: number;
} {
  const watchlist = readJSON(STORAGE_KEYS.watchlist);
  const portfolio = readJSON(STORAGE_KEYS.portfolio);
  const cash = readJSON(STORAGE_KEYS.cash);
  const snapshots = readJSON(STORAGE_KEYS.snapshots);
  const alerts = readJSON(STORAGE_KEYS.alerts);

  let sizeBytes = 0;
  try {
    sizeBytes = new Blob([JSON.stringify(localStorage)]).size;
  } catch {
    // ignore
  }

  return {
    watchlistCount: Array.isArray(watchlist) ? watchlist.length : 0,
    portfolioCount: Array.isArray(portfolio) ? portfolio.length : 0,
    cashCount: Array.isArray(cash) ? cash.length : 0,
    snapshotCount: Array.isArray(snapshots) ? snapshots.length : 0,
    alertCount: Array.isArray(alerts) ? alerts.length : 0,
    sizeBytes,
  };
}

// ============ helpers ============

function readJSON(key: string): unknown {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return undefined;
    return JSON.parse(v);
  } catch {
    return undefined;
  }
}

function validateBackup(data: unknown):
  | { ok: true; data: BackupData }
  | { ok: false; error: string } {
  if (!data || typeof data !== "object") {
    return { ok: false, error: "data bukan object" };
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.version !== "number") {
    return { ok: false, error: "field 'version' tidak ada" };
  }
  if (obj.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `versi backup ${obj.version} lebih baru dari app (max ${BACKUP_VERSION})`,
    };
  }
  if (!obj.exportedAt || typeof obj.exportedAt !== "string") {
    return { ok: false, error: "field 'exportedAt' tidak valid" };
  }
  return { ok: true, data: obj as unknown as BackupData };
}

function mergeData(key: string, existing: unknown, imported: unknown): unknown {
  // For arrays: concat, deduplicate by id if present
  if (!Array.isArray(existing) && !Array.isArray(imported)) return imported;
  const merged: unknown[] = [];
  const seen = new Set<string>();

  // For watchlist, portfolio, alerts: dedupe by id/ticker
  const getId = (item: unknown): string | null => {
    if (!item || typeof item !== "object") return null;
    const obj = item as Record<string, unknown>;
    return (
      (typeof obj.id === "string" ? obj.id : null) ??
      (typeof obj.ticker === "string" ? `ticker:${obj.ticker}` : null) ??
      null
    );
  };

  if (Array.isArray(existing)) {
    for (const item of existing) {
      const id = getId(item);
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      merged.push(item);
    }
  }
  if (Array.isArray(imported)) {
    for (const item of imported) {
      const id = getId(item);
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      merged.push(item);
    }
  }

  // Special case: snapshots — dedupe by date, keep newest value per date
  if (key === "snapshots" && Array.isArray(merged)) {
    const byDate = new Map<string, Record<string, unknown>>();
    for (const item of merged) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      const date = typeof obj.date === "string" ? obj.date : null;
      if (!date) continue;
      const prev = byDate.get(date);
      // Keep entry with later createdAt
      if (
        !prev ||
        (typeof obj.createdAt === "string" &&
          typeof prev.createdAt === "string" &&
          obj.createdAt > prev.createdAt)
      ) {
        byDate.set(date, obj);
      }
    }
    return Array.from(byDate.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date)),
    );
  }

  return merged;
}

/**
 * Reset All Data — hapus semua data app dari localStorage.
 *
 * Menghapus:
 *   - Watchlist, portfolio, cash ledger, snapshots, alerts
 *   - Self-analysis records
 *   - Peak prices (trailing stop tracker)
 *   - IHSG cache
 *
 * TIDAK menghapus:
 *   - Notification permission (browser-managed, stay granted)
 *   - Notification toggle (user preference — biarkan user atur sendiri)
 *
 * Setelah reset, dispatch event supaya semua UI re-render ke empty state.
 */
export function resetAllData(opts: { keepNotifications?: boolean } = {}): {
  removed: string[];
} {
  if (typeof window === "undefined") {
    throw new Error("resetAllData hanya berjalan di browser");
  }
  const removed: string[] = [];
  for (const key of ALL_STORAGE_KEYS) {
    if (opts.keepNotifications && key === STORAGE_KEYS.notifications) continue;
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      removed.push(key);
    }
  }
  // Broadcast supaya setiap UI yang subscribe reload
  window.dispatchEvent(new CustomEvent("portfolio-updated"));
  window.dispatchEvent(new CustomEvent("watchlist-updated"));
  window.dispatchEvent(new CustomEvent("self-analysis-updated"));
  return { removed };
}

/**
 * Hitung jumlah total item (untuk konfirmasi sebelum reset).
 */
export function getTotalItemCount(): number {
  const watchlist = readJSON(STORAGE_KEYS.watchlist);
  const portfolio = readJSON(STORAGE_KEYS.portfolio);
  const cash = readJSON(STORAGE_KEYS.cash);
  const snapshots = readJSON(STORAGE_KEYS.snapshots);
  const alerts = readJSON(STORAGE_KEYS.alerts);
  const selfAnalysis = readJSON(STORAGE_KEYS.selfAnalysis);

  return (
    (Array.isArray(watchlist) ? watchlist.length : 0) +
    (Array.isArray(portfolio) ? portfolio.length : 0) +
    (Array.isArray(cash) ? cash.length : 0) +
    (Array.isArray(snapshots) ? snapshots.length : 0) +
    (Array.isArray(alerts) ? alerts.length : 0) +
    (Array.isArray(selfAnalysis) ? selfAnalysis.length : 0)
  );
}

export { STORAGE_KEYS };
