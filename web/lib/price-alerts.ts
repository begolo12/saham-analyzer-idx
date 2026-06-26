/**
 * Price Target Alerts — storage & trigger logic.
 *
 * Multiple alert types:
 * - price_above / price_below: price target alerts
 * - pct_change: percentage change from current price
 * - volume_spike: volume exceeds a threshold
 *
 * Alert history tracks all triggered alerts.
 */

const ALERTS_KEY = "saham_price_alerts";
const ALERT_HISTORY_KEY = "saham_alert_history";

export type AlertDirection = "above" | "below";
export type AlertStatus = "armed" | "triggered";
export type AlertType = "price_above" | "price_below" | "pct_change" | "volume_spike";

export interface PriceAlert {
  id: string;
  ticker: string;
  threshold: number;
  direction: AlertDirection;
  status: AlertStatus;
  triggeredAt: number | null;
  triggeredPrice: number | null;
  note?: string;
  createdAt: string;
  alertType: AlertType;
  // For pct_change alerts: the base price when alert was created
  basePrice: number | null;
  // For volume_spike alerts: multiplier (e.g., 2 means volume > 2x average)
  volumeMultiplier: number | null;
}

export interface AlertHistoryEntry {
  id: string;
  alertId: string;
  ticker: string;
  alertType: AlertType;
  threshold: number;
  direction: AlertDirection;
  triggeredAt: number;
  triggeredPrice: number;
  triggeredVolume: number | null;
  note?: string;
}

// ─── Alerts CRUD ──────────────────────────────────────────────

export function getAlerts(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Migrate old alerts that don't have alertType
    return parsed.map((a: Record<string, unknown>) => ({
      ...a,
      alertType: (a as Record<string, unknown>).alertType ?? "price_above",
      basePrice: (a as Record<string, unknown>).basePrice ?? null,
      volumeMultiplier: (a as Record<string, unknown>).volumeMultiplier ?? null,
    })) as PriceAlert[];
  } catch {
    return [];
  }
}

function saveAlerts(alerts: PriceAlert[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  window.dispatchEvent(new CustomEvent("alerts-updated"));
}

export function addAlert(
  data: Omit<PriceAlert, "id" | "status" | "triggeredAt" | "triggeredPrice" | "createdAt">,
): PriceAlert {
  const alert: PriceAlert = {
    ...data,
    alertType: data.alertType ?? "price_above",
    basePrice: data.basePrice ?? null,
    volumeMultiplier: data.volumeMultiplier ?? null,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    status: "armed",
    triggeredAt: null,
    triggeredPrice: null,
    createdAt: new Date().toISOString(),
  };
  const all = getAlerts();
  saveAlerts([...all, alert]);
  return alert;
}

export function removeAlert(id: string): void {
  const all = getAlerts();
  saveAlerts(all.filter((a) => a.id !== id));
}

export function rearmAlert(id: string): void {
  const all = getAlerts();
  saveAlerts(
    all.map((a) =>
      a.id === id
        ? { ...a, status: "armed" as const, triggeredAt: null, triggeredPrice: null }
        : a,
    ),
  );
}

export function clearAllAlerts(): void {
  saveAlerts([]);
}

// ─── Alert History ────────────────────────────────────────────

export function getAlertHistory(): AlertHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALERT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as AlertHistoryEntry[];
  } catch {
    return [];
  }
}

function saveAlertHistory(history: AlertHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ALERT_HISTORY_KEY, JSON.stringify(history));
}

export function addAlertHistoryEntry(entry: Omit<AlertHistoryEntry, "id">): void {
  const history = getAlertHistory();
  const newEntry: AlertHistoryEntry = {
    ...entry,
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  };
  // Keep last 100 entries
  const updated = [newEntry, ...history].slice(0, 100);
  saveAlertHistory(updated);
}

export function clearAlertHistory(): void {
  saveAlertHistory([]);
}

export function getAlertHistoryForTicker(ticker: string): AlertHistoryEntry[] {
  const t = ticker.toUpperCase();
  return getAlertHistory().filter((h) => h.ticker === t);
}

// ─── Alert Checking ───────────────────────────────────────────

/**
 * Check alerts against current prices. Returns newly-triggered alerts
 * (status changed from armed → triggered this call).
 *
 * Caller should pass the live price map from /api/quick.
 */
export function checkAlerts(
  alerts: PriceAlert[],
  prices: Record<string, number | null>,
  volumes?: Record<string, number | null>,
  averageVolumes?: Record<string, number | null>,
): { newlyTriggered: PriceAlert[]; updated: PriceAlert[] } {
  const newlyTriggered: PriceAlert[] = [];
  const updated = alerts.map((alert) => {
    if (alert.status !== "armed") return alert;
    const ticker = alert.ticker.toUpperCase();
    const price = prices[ticker];
    if (price === null || price === undefined || !Number.isFinite(price)) {
      return alert;
    }

    let hit = false;
    let triggeredPrice = price;

    switch (alert.alertType) {
      case "price_above":
        hit = price >= alert.threshold;
        triggeredPrice = price;
        break;
      case "price_below":
        hit = price <= alert.threshold;
        triggeredPrice = price;
        break;
      case "pct_change": {
        // threshold is the percentage change to trigger at
        const basePrice = alert.basePrice ?? price;
        if (basePrice > 0) {
          const pctChange = ((price - basePrice) / basePrice) * 100;
          if (alert.direction === "above") {
            hit = pctChange >= alert.threshold;
          } else {
            hit = pctChange <= -alert.threshold;
          }
          triggeredPrice = price;
        }
        break;
      }
      case "volume_spike": {
        // Check if volume exceeds average * multiplier
        const vol = volumes?.[ticker];
        const avgVol = averageVolumes?.[ticker];
        if (vol !== null && vol !== undefined && avgVol !== null && avgVol !== undefined && avgVol > 0) {
          const mult = alert.volumeMultiplier ?? alert.threshold;
          hit = vol >= avgVol * mult;
          triggeredPrice = price;
        }
        break;
      }
      default:
        // Fallback to original behavior
        hit = alert.direction === "above"
          ? price >= alert.threshold
          : price <= alert.threshold;
        triggeredPrice = price;
    }

    if (hit) {
      const next: PriceAlert = {
        ...alert,
        status: "triggered",
        triggeredAt: Date.now(),
        triggeredPrice,
      };
      newlyTriggered.push(next);

      // Add to history
      addAlertHistoryEntry({
        alertId: alert.id,
        ticker: alert.ticker,
        alertType: alert.alertType ?? "price_above",
        threshold: alert.threshold,
        direction: alert.direction,
        triggeredAt: Date.now(),
        triggeredPrice,
        triggeredVolume: volumes?.[ticker] ?? null,
        note: alert.note,
      });

      return next;
    }
    return alert;
  });

  if (newlyTriggered.length > 0) {
    saveAlerts(updated);
  }

  return { newlyTriggered, updated };
}

export function getAlertsForTicker(alerts: PriceAlert[], ticker: string): PriceAlert[] {
  const t = ticker.toUpperCase();
  return alerts.filter((a) => a.ticker === t);
}

export const ALERTS_STORAGE_KEY = ALERTS_KEY;
