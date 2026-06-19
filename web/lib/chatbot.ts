/**
 * AI Chatbot — Rule-based Q&A untuk saham.
 *
 * Tanpa API eksternal. Pakai:
 * - Pattern matching untuk pertanyaan umum
 * - Local data (watchlist, portfolio) untuk personalized answers
 * - Quick actions untuk navigate ke tools
 *
 * Bisa di-extend nanti dengan API (OpenAI/Claude) untuk Q&A natural.
 */

import { POPULAR_STOCKS } from "@/lib/popular-stocks";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  suggestions?: ChatSuggestion[];
  data?: {
    portfolioSummary?: PortfolioSummaryData;
    watchlistTickers?: string[];
  };
}

export interface ChatSuggestion {
  label: string;
  prompt?: string; // Send this as user message
  href?: string; // Or navigate to this URL
  icon?: string;
}

export interface PortfolioSummaryData {
  totalValue: number;
  totalCost: number;
  totalPL: number;
  totalPLPct: number;
  holdingsCount: number;
  bestTrade?: { ticker: string; pl: number } | null;
  worstTrade?: { ticker: string; pl: number } | null;
}

/**
 * Process user message and return response.
 */
export function processMessage(
  text: string,
  context: {
    portfolioSummary?: PortfolioSummaryData;
    watchlistTickers?: string[];
  } = {},
): {
  text: string;
  suggestions?: ChatSuggestion[];
  data?: ChatMessage["data"];
} {
  const lower = text.toLowerCase().trim();

  // Portfolio summary
  if (matchesAny(lower, ["portfolio", "portofolio", "modal saya", "aset saya", "berapa punya saya"])) {
    return respondPortfolio(context.portfolioSummary);
  }

  // Watchlist
  if (matchesAny(lower, ["watchlist", "watch list", "favorit", "favorit saya"])) {
    return respondWatchlist(context.watchlistTickers);
  }

  // Comparison
  if (matchesAny(lower, ["bandingkan", "compare", "vs", "versus"])) {
    return respondCompare(text);
  }

  // Backtest
  if (matchesAny(lower, ["backtest", "test strategi", "simulasi"])) {
    return respondBacktest(text);
  }

  // Best stocks (high dividend, value, etc)
  if (matchesAny(lower, ["saham bagus", "rekomendasi", "saham terbaik", "saham murah", "dividen"])) {
    return respondRecommendations(text);
  }

  // Search for ticker
  const tickerMatch = extractTicker(text);
  if (tickerMatch) {
    return respondTicker(tickerMatch);
  }

  // Help
  if (matchesAny(lower, ["help", "bantuan", "?", "apa yang bisa"])) {
    return respondHelp();
  }

  // Greeting
  if (matchesAny(lower, ["halo", "hai", "hello", "hi", "selamat"])) {
    return {
      text: "Halo! 👋 Saya chatbot Saham Analyzer. Tanya saya soal portfolio, watchlist, saham, atau minta rekomendasi. Coba tanya 'rekomendasi saham bagus' atau 'portfolio saya'.",
      suggestions: [
        { label: "📊 Portfolio saya", prompt: "Portfolio saya" },
        { label: "⭐ Watchlist saya", prompt: "Watchlist saya" },
        { label: "📈 Rekomendasi", prompt: "Saham bagus hari ini?" },
        { label: "❓ Bantuan", prompt: "Bantuan" },
      ],
    };
  }

  // Default fallback
  return {
    text: "Maaf, saya belum paham pertanyaan itu. Coba tanya:\n• Portfolio saya\n• Watchlist saya\n• Saham bagus hari ini?\n• Bandingkan BBCA vs BMRI\n• Backtest BBCA",
    suggestions: [
      { label: "📊 Portfolio saya", prompt: "Portfolio saya" },
      { label: "📈 Rekomendasi", prompt: "Saham bagus hari ini?" },
      { label: "❓ Bantuan", prompt: "Bantuan" },
    ],
  };
}

// ============ Helpers ============

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

function extractTicker(text: string): string | null {
  // Find uppercase 4-letter tickers in the text
  const match = text.match(/\b[A-Z]{4}\b/);
  return match ? match[0] : null;
}

// ============ Response Generators ============

function respondPortfolio(summary?: PortfolioSummaryData) {
  if (!summary) {
    return {
      text: "Kamu belum punya transaksi portfolio. Mulai dengan Top Up modal di halaman Portfolio, lalu beli saham pertamamu!",
      suggestions: [
        { label: "💼 Buka Portfolio", href: "/portfolio" },
        { label: "🔍 Cari Saham", href: "/" },
      ],
    };
  }
  const plSign = summary.totalPL >= 0 ? "+" : "";
  const plColor = summary.totalPL >= 0 ? "🟢" : "🔴";
  const bestWorst =
    summary.bestTrade && summary.worstTrade
      ? `\n🏆 Best: ${summary.bestTrade.ticker} (${plSign}${formatIDR(summary.bestTrade.pl)})\n💀 Worst: ${summary.worstTrade.ticker} (${formatIDR(summary.worstTrade.pl)})`
      : "";

  return {
    text: `📊 **Portfolio Kamu**\n\n💰 Nilai saat ini: ${formatIDR(summary.totalValue)}\n📦 Modal: ${formatIDR(summary.totalCost)}\n${plColor} P&L: ${plSign}${formatIDR(summary.totalPL)} (${plSign}${summary.totalPLPct.toFixed(2)}%)\n📈 Holdings: ${summary.holdingsCount} saham${bestWorst}`,
    suggestions: [
      { label: "💼 Detail Portfolio", href: "/portfolio" },
      { label: "📊 vs IHSG", href: "/portfolio" },
    ],
  };
}

function respondWatchlist(tickers?: string[]) {
  if (!tickers || tickers.length === 0) {
    return {
      text: "Watchlist kamu masih kosong. Tambahkan saham favorit dari halaman analisa saham (klik ⭐).",
      suggestions: [
        { label: "⭐ Buka Watchlist", href: "/watchlist" },
        { label: "🔍 Cari Saham", href: "/" },
      ],
    };
  }
  return {
    text: `⭐ **Watchlist Kamu**\n\nAda ${tickers.length} saham: ${tickers.slice(0, 10).join(", ")}${tickers.length > 10 ? `, +${tickers.length - 10} lainnya` : ""}`,
    suggestions: [
      { label: "⭐ Lihat Watchlist", href: "/watchlist" },
    ],
  };
}

function respondCompare(text: string) {
  const tickers = extractMultipleTickers(text);
  if (tickers.length >= 2) {
    return {
      text: `Bandingkan ${tickers.join(" vs ")}`,
      suggestions: [
        {
          label: `🆚 Bandingkan ${tickers[0]} vs ${tickers[1]}`,
          href: `/compare?tickers=${tickers.join(",")}`,
        },
      ],
    };
  }
  return {
    text: "Bandingkan 2-3 saham IDX side-by-side. Sebutkan ticker saham, misal: 'Bandingkan BBCA vs BMRI' atau 'BBCA TLKM ASII'.",
    suggestions: [
      { label: "🆚 BBCA vs BMRI", prompt: "Bandingkan BBCA vs BMRI" },
      { label: "🆚 TLKM vs ISAT", prompt: "Bandingkan TLKM vs ISAT" },
      { label: "📊 Buka Compare", href: "/compare" },
    ],
  };
}

function respondBacktest(text: string) {
  const ticker = extractTicker(text) || "BBCA";
  return {
    text: `Test strategi trading ${ticker} di data historis. Pilih RSI Mean Reversion, SMA Crossover, atau Buy & Hold sebagai benchmark.`,
    suggestions: [
      {
        label: `🧪 Backtest ${ticker}`,
        href: `/backtest?ticker=${ticker}`,
      },
      { label: "📊 Buka Backtest", href: "/backtest" },
    ],
  };
}

function respondRecommendations(text: string) {
  const isDividend = text.toLowerCase().includes("dividen");
  const screen = isDividend ? "dividend" : "value";

  const popularBySector: Record<string, string[]> = {
    bank: ["BBCA", "BMRI", "BBRI", "BBNI", "BRIS"],
    telco: ["TLKM", "ISAT", "EXCL"],
    consumer: ["ICBP", "INDF", "UNVR", "HMSP"],
    mining: ["ANTM", "INCO", "PTBA", "ADRO"],
    property: ["BSDE", "PWON", "CTRA", "SMGR"],
  };
  const sample = popularBySector.bank.join(", ");

  return {
    text: `📈 **Rekomendasi Saham**\n\nBerdasarkan analisa Value/Dividend, beberapa saham yang layak dilirik:\n\n🏦 Bank: ${sample}\n🍔 Consumer: ICBP, INDF, UNVR\n⛏️ Mining: ANTM, INCO, ADRO\n📡 Telco: TLKM, ISAT\n\nMau filter lebih spesifik? Gunakan Screener.`,
    suggestions: [
      { label: "🎯 Screener Value", href: "/screener?screen=value" },
      { label: "💰 Screener Dividend", href: "/screener?screen=dividend" },
      { label: "📊 Lihat Fundamental Bagus", href: "/" },
    ],
  };
}

function respondTicker(ticker: string) {
  const stock = POPULAR_STOCKS.find((s) => s.code === ticker);
  const stockName = stock?.name || ticker;
  return {
    text: `📊 ${ticker}${stockName ? ` — ${stockName}` : ""}\n\nKlik untuk lihat analisa lengkap: harga, P/E, P/B, ROE, dividen yield, RSI, MACD, dan performa historis.`,
    suggestions: [
      { label: `📊 Lihat ${ticker}`, href: `/stock/${ticker}` },
      { label: `🆚 Bandingkan`, prompt: `Bandingkan ${ticker} vs` },
      { label: `🧪 Backtest`, prompt: `Backtest ${ticker}` },
    ],
  };
}

function respondHelp() {
  return {
    text: `🤖 **Apa yang bisa saya bantu?**\n\nSaya bisa menjawab:\n\n📊 **Portfolio** — "Portfolio saya", "Modal saya berapa?"\n⭐ **Watchlist** — "Watchlist saya", "Saham favorit saya"\n📈 **Rekomendasi** — "Saham bagus?", "Rekomendasi hari ini"\n🆚 **Bandingkan** — "Bandingkan BBCA vs BMRI"\n🧪 **Backtest** — "Backtest BBCA", "Test strategi"\n🔍 **Info Saham** — sebut ticker (BBCA, TLKM, dll)\n\nAtau klik suggestion di bawah.`,
    suggestions: [
      { label: "📊 Portfolio saya", prompt: "Portfolio saya" },
      { label: "⭐ Watchlist saya", prompt: "Watchlist saya" },
      { label: "📈 Rekomendasi", prompt: "Saham bagus hari ini?" },
      { label: "🆚 Compare BBCA vs BMRI", prompt: "Bandingkan BBCA vs BMRI" },
    ],
  };
}

function extractMultipleTickers(text: string): string[] {
  const matches = text.match(/\b[A-Z]{4}\b/g);
  return matches ? Array.from(new Set(matches)) : [];
}

function formatIDR(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1e9).toFixed(1)}M`;
  if (v >= 1_000_000) return `${(v / 1e6).toFixed(1)}jt`;
  if (v >= 1_000) return `${(v / 1e3).toFixed(0)}rb`;
  return String(Math.round(v));
}
