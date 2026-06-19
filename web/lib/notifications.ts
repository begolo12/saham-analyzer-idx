/**
 * Push Notification Manager
 *
 * Uses browser Notification API for in-page alerts. Without a service worker,
 * this only works when the user is on the page. For true background push,
 * you'd need a PWA service worker + push service.
 *
 * Permission states:
 *   - "default": not yet asked
 *   - "granted": user accepted
 *   - "denied": user blocked
 */

export type NotificationPermissionState =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

const TOGGLE_KEY = "saham_notifications_enabled";

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return "unsupported";
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as NotificationPermissionState;
}

export function isNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = localStorage.getItem(TOGGLE_KEY);
    return v === null ? true : v === "1"; // default ON
  } catch {
    return false;
  }
}

export function setNotificationsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOGGLE_KEY, enabled ? "1" : "0");
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return "unsupported";
  try {
    const result = await Notification.requestPermission();
    return result as NotificationPermissionState;
  } catch {
    return "denied";
  }
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  silent?: boolean;
}

export function showNotification(opts: NotificationOptions): boolean {
  if (!isNotificationSupported()) return false;
  if (getNotificationPermission() !== "granted") return false;
  if (!isNotificationsEnabled()) return false;

  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      icon: opts.icon ?? "/favicon.ico",
      badge: opts.badge ?? "/favicon.ico",
      tag: opts.tag,
      silent: opts.silent ?? false,
    });
    if (opts.url) {
      n.onclick = () => {
        window.focus();
        window.location.href = opts.url!;
        n.close();
      };
    }
    setTimeout(() => n.close(), 8000);
    return true;
  } catch (err) {
    console.error("Notification failed:", err);
    return false;
  }
}

function formatIDR(v: number): string {
  if (v >= 1_000_000_000_000) return `${(v / 1e12).toFixed(1)}T`;
  if (v >= 1_000_000_000) return `${(v / 1e9).toFixed(1)}M`;
  if (v >= 1_000_000) return `${(v / 1e6).toFixed(0)}jt`;
  if (v >= 1_000) return `${(v / 1e3).toFixed(0)}rb`;
  return String(v);
}

/**
 * Notification templates for common events.
 */
export const NotificationTemplates = {
  alertTriggered: (
    ticker: string,
    threshold: number,
    direction: "above" | "below",
    currentPrice: number,
  ) => ({
    title: `🔔 ${ticker} ${direction === "above" ? "naik" : "turun"} menyentuh target`,
    body: `Target ${formatIDR(threshold)} tercapai. Harga saat ini ${formatIDR(currentPrice)}`,
    tag: `alert-${ticker}`,
    url: `/stock/${ticker}`,
  }),
  bigDrop: (ticker: string, changePct: number, currentPrice: number) => ({
    title: `🚨 ${ticker} turun tajam ${changePct.toFixed(2)}%`,
    body: `Harga saat ini ${formatIDR(currentPrice)}. Cek apakah perlu cut loss.`,
    tag: `drop-${ticker}`,
    url: `/stock/${ticker}`,
  }),
  bigGain: (ticker: string, changePct: number, currentPrice: number) => ({
    title: `🚀 ${ticker} naik ${changePct.toFixed(2)}%`,
    body: `Harga saat ini ${formatIDR(currentPrice)}. Pertimbangkan take profit.`,
    tag: `gain-${ticker}`,
    url: `/stock/${ticker}`,
  }),
  priceAlertSet: (
    ticker: string,
    threshold: number,
    direction: "above" | "below",
  ) => ({
    title: `🔔 Alert ${ticker} dipasang`,
    body: `Notifikasi aktif saat ${ticker} ${direction === "above" ? ">" : "<"} ${formatIDR(threshold)}`,
    tag: `alert-set-${ticker}`,
  }),
};
