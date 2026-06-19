/**
 * i18n (Internationalization) — multi-language support.
 *
 * Default: Indonesian (id). Alternative: English (en).
 *
 * Pendekatan sederhana: key-value dict untuk label UI utama.
 * Konten spesifik IDX (nama saham, sektor) tetap dalam Bahasa Indonesia.
 *
 * Cara pakai:
 *   const { lang, setLang, t } = useLanguage();
 *   <h1>{t("homepage.title")}</h1>
 *
 * atau:
 *   const t = useTranslations("id");
 */

"use client";

import { useEffect, useState } from "react";

export type Lang = "id" | "en";

const STORAGE_KEY = "saham_language";

export const SUPPORTED_LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

// Translation dictionaries
const translations: Record<Lang, Record<string, string>> = {
  id: {
    // Navigation
    "nav.home": "Beranda",
    "nav.screener": "Screener",
    "nav.watchlist": "Watchlist",
    "nav.portfolio": "Portfolio",
    "nav.settings": "Settings",

    // Homepage
    "home.hero.tagline": "Cari, analisa, dan kelola portfolio saham Indonesia",
    "home.disclaimer": "Alat bantu analisa, bukan saran finansial",

    // Sections
    "section.daily_briefing": "Daily Briefing",
    "section.sector_heatmap": "Sector Heatmap",
    "section.fundamental_screener": "Saham Fundamental Bagus",
    "section.foreign_flow": "Foreign Flow (Asing)",
    "section.today_movers": "Pergerakan Hari Ini",
    "section.top_gainers": "Top Gainers",
    "section.top_losers": "Top Losers",
    "section.quick_actions": "Aksi Cepat",

    // Common
    "common.search": "Cari",
    "common.see_all": "Lihat Semua",
    "common.loading": "Memuat...",
    "common.error": "Gagal memuat data",
    "common.retry": "Coba Lagi",
    "common.cancel": "Batal",
    "common.save": "Simpan",
    "common.delete": "Hapus",
    "common.confirm": "Konfirmasi",
    "common.close": "Tutup",
    "common.next": "Lanjut",
    "common.previous": "Kembali",
    "common.yes": "Ya",
    "common.no": "Tidak",

    // Watchlist
    "watchlist.title": "Watchlist",
    "watchlist.empty": "Belum ada saham di watchlist",
    "watchlist.add": "Tambah Saham",

    // Portfolio
    "portfolio.title": "Portfolio",
    "portfolio.virtual": "Virtual Portfolio",
    "portfolio.disclaimer":
      "Track transaksi beli/jual Anda untuk hitung profit/loss real-time.",
    "portfolio.topup": "Top Up",
    "portfolio.withdraw": "Withdraw",
    "portfolio.buy_sell": "Beli/Jual",
    "portfolio.empty": "Portfolio Kosong",
    "portfolio.empty_desc":
      "Mulai dengan Top Up modal, lalu beli saham pertama Anda.",
    "portfolio.total": "Total Portfolio",

    // Settings
    "settings.title": "Settings & Self-Analysis",
    "settings.subtitle": "Sistem yang belajar dari kesalahannya sendiri",
    "settings.backup": "Backup & Restore",
    "settings.reset": "Reset Semua Data",
    "settings.notifications": "Push Notifications",
    "settings.language": "Bahasa",

    // Stock detail
    "stock.summary": "Ringkasan",
    "stock.technical": "Teknikal",
    "stock.fundamental": "Fundamental",
    "stock.performance": "Performa",
    "stock.sentiment": "Sentimen",
    "stock.add_to_watchlist": "Tambah ke Watchlist",
    "stock.remove_from_watchlist": "Hapus dari Watchlist",
    "stock.set_alert": "Set Alert Harga",
    "stock.buy": "Beli",
    "stock.sell": "Jual",

    // Compare
    "compare.title": "Bandingkan Saham",
    "compare.subtitle":
      "Bandingkan 2-3 saham IDX side-by-side: harga, valuation, fundamental, teknikal, performa.",

    // Backtest
    "backtest.title": "Backtest Strategi",
    "backtest.subtitle":
      "Test strategi trading di data historis. Bandingkan return dengan IHSG.",

    // Onboarding
    "onboarding.welcome": "Selamat Datang",
    "onboarding.skip": "Lewati tour",
    "onboarding.start": "Mulai!",
  },
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.screener": "Screener",
    "nav.watchlist": "Watchlist",
    "nav.portfolio": "Portfolio",
    "nav.settings": "Settings",

    // Homepage
    "home.hero.tagline":
      "Search, analyze, and manage your Indonesian stock portfolio",
    "home.disclaimer": "Analysis tool, not financial advice",

    // Sections
    "section.daily_briefing": "Daily Briefing",
    "section.sector_heatmap": "Sector Heatmap",
    "section.fundamental_screener": "Good Fundamental Stocks",
    "section.foreign_flow": "Foreign Flow",
    "section.today_movers": "Today's Movers",
    "section.top_gainers": "Top Gainers",
    "section.top_losers": "Top Losers",
    "section.quick_actions": "Quick Actions",

    // Common
    "common.search": "Search",
    "common.see_all": "See All",
    "common.loading": "Loading...",
    "common.error": "Failed to load data",
    "common.retry": "Retry",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.confirm": "Confirm",
    "common.close": "Close",
    "common.next": "Next",
    "common.previous": "Back",
    "common.yes": "Yes",
    "common.no": "No",

    // Watchlist
    "watchlist.title": "Watchlist",
    "watchlist.empty": "No stocks in watchlist yet",
    "watchlist.add": "Add Stock",

    // Portfolio
    "portfolio.title": "Portfolio",
    "portfolio.virtual": "Virtual Portfolio",
    "portfolio.disclaimer":
      "Track your buy/sell transactions to calculate real-time P&L.",
    "portfolio.topup": "Top Up",
    "portfolio.withdraw": "Withdraw",
    "portfolio.buy_sell": "Buy/Sell",
    "portfolio.empty": "Empty Portfolio",
    "portfolio.empty_desc":
      "Start by topping up funds, then buy your first stock.",
    "portfolio.total": "Total Portfolio",

    // Settings
    "settings.title": "Settings & Self-Analysis",
    "settings.subtitle": "A system that learns from its own mistakes",
    "settings.backup": "Backup & Restore",
    "settings.reset": "Reset All Data",
    "settings.notifications": "Push Notifications",
    "settings.language": "Language",

    // Stock detail
    "stock.summary": "Summary",
    "stock.technical": "Technical",
    "stock.fundamental": "Fundamental",
    "stock.performance": "Performance",
    "stock.sentiment": "Sentiment",
    "stock.add_to_watchlist": "Add to Watchlist",
    "stock.remove_from_watchlist": "Remove from Watchlist",
    "stock.set_alert": "Set Price Alert",
    "stock.buy": "Buy",
    "stock.sell": "Sell",

    // Compare
    "compare.title": "Compare Stocks",
    "compare.subtitle":
      "Compare 2-3 IDX stocks side-by-side: price, valuation, fundamentals, technical, performance.",

    // Backtest
    "backtest.title": "Backtest Strategy",
    "backtest.subtitle":
      "Test trading strategies on historical data. Compare returns with IHSG.",

    // Onboarding
    "onboarding.welcome": "Welcome",
    "onboarding.skip": "Skip tour",
    "onboarding.start": "Start!",
  },
};

/**
 * Get translation for a key. Falls back to Indonesian if not found.
 */
export function translate(lang: Lang, key: string): string {
  return translations[lang]?.[key] ?? translations.id[key] ?? key;
}

/**
 * Hook for current language + translate function.
 */
export function useLanguage() {
  const [lang, setLangState] = useState<Lang>("id");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored && (stored === "id" || stored === "en")) {
        setLangState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {
      // ignore
    }
  };

  const t = (key: string): string => translate(lang, key);

  return { lang, setLang, t, mounted };
}

/**
 * Convenience hook: just the translate function.
 */
export function useTranslations(): (key: string) => string {
  const { t } = useLanguage();
  return t;
}
