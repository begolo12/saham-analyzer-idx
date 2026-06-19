/**
 * Price Target Alerts — storage & trigger logic.
 *
 * User bisa pasang alert per ticker: "Beri tahu kalau BBCA > 7.000"
 * atau "Beri tahu kalau BBCA < 5.500".
 *
 * Alert punya state: armed (belum trigger) | triggered (sudah trigger).
 * Trigger hanya sekali per lifecycle (tidak spam), tapi bisa di-arm ulang.
 */

const ALERTS_KEY = "saham_price_alerts";

export type AlertDirection = "above" | "below";
export type AlertStatus = "armed" | "triggered";

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
}

export function getAlerts(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as PriceAlert[];
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
        ? { ...a, status: "armed", triggeredAt: null, triggeredPrice: null }
        : a,
    ),
  );
}

export function clearAllAlerts(): void {
  saveAlerts([]);
}

/**
 * Check alerts against current prices. Returns newly-triggered alerts
 * (status changed from armed → triggered this call).
 *
 * Caller should pass the live price map from /api/quick.
 */
export function checkAlerts(
  alerts: PriceAlert[],
  prices: Record<string, number | null>,
): { newlyTriggered: PriceAlert[]; updated: PriceAlert[] } {
  const newlyTriggered: PriceAlert[] = [];
  const updated = alerts.map((alert) => {
    if (alert.status !== "armed") return alert;
    const price = prices[alert.ticker.toUpperCase()];
    if (price === null || price === undefined || !Number.isFinite(price)) {
      return alert;
    }
    const hit =
      alert.direction === "above"
        ? price >= alert.threshold
        : price <= alert.threshold;
    if (hit) {
      const next: PriceAlert = {
        ...alert,
        status: "triggered",
        triggeredAt: Date.now(),
        triggeredPrice: price,
      };
      newlyTriggered.push(next);
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
