/**
 * Portfolio Types & Logic
 * Virtual portfolio tracker untuk saham IDX.
 *
 * Fitur:
 * - Buy/Sell transactions dengan date, price, qty, fee
 * - Current holdings (qty per ticker, average price)
 * - Realized P&L (dari transaksi jual)
 * - Unrealized P&L (mark-to-market dengan harga saat ini)
 * - Portfolio composition & history
 */

export type TransactionType = "BUY" | "SELL";

export interface Transaction {
  id: string;
  ticker: string; // Tanpa .JK
  type: TransactionType;
  date: string; // ISO date string YYYY-MM-DD
  price: number; // Harga per lembar
  quantity: number; // Jumlah lembar (lot = 100 lembar)
  fee: number; // Biaya transaksi (default 0.15%)
  notes?: string;
  createdAt: string; // ISO timestamp
}

export interface Holding {
  ticker: string;
  totalShares: number;
  averagePrice: number; // Harga rata-rata pembelian
  totalCost: number; // Total modal (price * qty + fee)
  currentPrice: number | null; // Harga saat ini (untuk mark-to-market)
  currentValue: number | null; // Nilai saat ini (currentPrice * qty)
  unrealizedPL: number | null; // currentValue - totalCost
  unrealizedPLPercent: number | null; // unrealizedPL / totalCost * 100
  realizedPL: number; // P&L dari penjualan (locked-in)
  buyTransactions: number;
  sellTransactions: number;
}

export interface PortfolioSummary {
  totalCost: number; // Total modal di portfolio aktif
  totalValue: number; // Nilai saat ini
  totalRealizedPL: number; // Total realized P&L
  totalUnrealizedPL: number; // Total unrealized P&L
  totalPL: number; // Total P&L (realized + unrealized)
  totalPLPercent: number; // % return
  holdingsCount: number;
  transactionsCount: number;
  winRate: number; // % transaksi yang untung
  bestTrade: { ticker: string; pl: number; plPercent: number } | null;
  worstTrade: { ticker: string; pl: number; plPercent: number } | null;
}

/**
 * Hitung holdings dari daftar transaksi.
 * Menggunakan FIFO (First In First Out) untuk tracking cost basis.
 */
export function calculateHoldings(
  transactions: Transaction[],
  currentPrices: Record<string, number> = {},
): Holding[] {
  // Group by ticker
  const byTicker: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    if (!byTicker[tx.ticker]) byTicker[tx.ticker] = [];
    byTicker[tx.ticker].push(tx);
  }

  const holdings: Holding[] = [];

  for (const ticker in byTicker) {
    // FIFO queue of buys. Sort by date ascending; tiebreak by createdAt then id
    // (both unique) so that SELL never precedes its BUY when same-day trades
    // land in the array newest-first (addTransaction uses unshift).
    const txs = byTicker[ticker].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      const createdDiff =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (createdDiff !== 0) return createdDiff;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

    let totalShares = 0;
    let totalCost = 0;
    let realizedPL = 0;
    let buyCount = 0;
    let sellCount = 0;

    // FIFO queue of buys
    const buyQueue: { shares: number; price: number; fee: number }[] = [];

    for (const tx of txs) {
      if (tx.type === "BUY") {
        const cost = tx.price * tx.quantity + tx.fee;
        totalShares += tx.quantity;
        totalCost += cost;
        buyQueue.push({ shares: tx.quantity, price: tx.price, fee: tx.fee });
        buyCount++;
      } else if (tx.type === "SELL") {
        let remaining = tx.quantity;
        const feePerShare = tx.quantity > 0 ? tx.fee / tx.quantity : 0;
        let costOfSold = 0;
        let proceedsOfSold = 0;
        let sharesSold = 0;

        while (remaining > 0 && buyQueue.length > 0) {
          const buy = buyQueue[0];
          const used = Math.min(buy.shares, remaining);
          // Cost per share includes proportional fee
          const costPerShare = (buy.price * buy.shares + buy.fee) / buy.shares;
          costOfSold += used * costPerShare;
          // Proceeds per share is sell price minus proportional fee
          proceedsOfSold += used * (tx.price - feePerShare);

          buy.shares -= used;
          remaining -= used;
          sharesSold += used;
          if (buy.shares === 0) buyQueue.shift();
        }

        // Cap at actual shares we owned — never let totalShares go negative
        totalShares -= sharesSold;
        // Reduce totalCost by actual cost basis of shares sold (not by ratio)
        totalCost -= costOfSold;
        realizedPL += proceedsOfSold - costOfSold;
        sellCount++;
      }
    }

    if (totalShares <= 0 && buyCount === 0) continue;

    const avgPrice = totalShares > 0 ? totalCost / totalShares : 0;
    const currentPrice = currentPrices[ticker] ?? null;
    const currentValue = currentPrice !== null ? currentPrice * totalShares : null;
    const unrealizedPL = currentValue !== null ? currentValue - totalCost : null;
    const unrealizedPLPercent =
      unrealizedPL !== null && totalCost > 0
        ? (unrealizedPL / totalCost) * 100
        : null;

    holdings.push({
      ticker,
      totalShares,
      averagePrice: Math.round(avgPrice * 100) / 100,
      totalCost: Math.round(totalCost),
      currentPrice,
      currentValue,
      unrealizedPL: unrealizedPL !== null ? Math.round(unrealizedPL) : null,
      unrealizedPLPercent:
        unrealizedPLPercent !== null
          ? Math.round(unrealizedPLPercent * 100) / 100
          : null,
      realizedPL: Math.round(realizedPL),
      buyTransactions: buyCount,
      sellTransactions: sellCount,
    });
  }

  return holdings.sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0));
}

/**
 * Hitung summary portfolio.
 */
export function calculateSummary(
  holdings: Holding[],
  transactions: Transaction[],
): PortfolioSummary {
  const activeHoldings = holdings.filter((h) => h.totalShares > 0);
  const totalCost = activeHoldings.reduce((sum, h) => sum + h.totalCost, 0);
  const totalValue = activeHoldings.reduce(
    (sum, h) => sum + (h.currentValue ?? h.totalCost),
    0,
  );
  const totalRealizedPL = holdings.reduce((sum, h) => sum + h.realizedPL, 0);
  const totalUnrealizedPL = activeHoldings.reduce(
    (sum, h) => sum + (h.unrealizedPL ?? 0),
    0,
  );
  const totalPL = totalRealizedPL + totalUnrealizedPL;
  const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  // Win rate: berapa transaksi SELL yang untung
  const sellTransactions = transactions.filter((t) => t.type === "SELL");
  let winCount = 0;
  for (const tx of sellTransactions) {
    // Cari buy pertama sebelum sell
    const priorBuys = transactions.filter(
      (t) => t.ticker === tx.ticker && t.type === "BUY" && t.date <= tx.date,
    );
    if (priorBuys.length > 0) {
      const avgBuyPrice =
        priorBuys.reduce((sum, b) => sum + b.price, 0) / priorBuys.length;
      if (tx.price > avgBuyPrice) winCount++;
    }
  }
  const winRate = sellTransactions.length > 0 ? (winCount / sellTransactions.length) * 100 : 0;

  // Best & worst trade (berdasarkan realized P&L per saham)
  const closedTrades: Record<string, { pl: number; qty: number }> = {};
  for (const tx of transactions) {
    if (tx.type === "SELL") {
      if (!closedTrades[tx.ticker]) closedTrades[tx.ticker] = { pl: 0, qty: 0 };
      closedTrades[tx.ticker].pl += (tx.price - tx.price) * 0; // simplified
      closedTrades[tx.ticker].qty += tx.quantity;
    }
  }

  let bestTrade: PortfolioSummary["bestTrade"] = null;
  let worstTrade: PortfolioSummary["worstTrade"] = null;

  for (const h of holdings) {
    if (h.realizedPL !== 0 && h.sellTransactions > 0) {
      const plPercent = h.totalCost > 0 ? (h.realizedPL / h.totalCost) * 100 : 0;
      const trade = { ticker: h.ticker, pl: h.realizedPL, plPercent };
      if (!bestTrade || trade.pl > bestTrade.pl) bestTrade = trade;
      if (!worstTrade || trade.pl < worstTrade.pl) worstTrade = trade;
    }
  }

  return {
    totalCost: Math.round(totalCost),
    totalValue: Math.round(totalValue),
    totalRealizedPL: Math.round(totalRealizedPL),
    totalUnrealizedPL: Math.round(totalUnrealizedPL),
    totalPL: Math.round(totalPL),
    totalPLPercent: Math.round(totalPLPercent * 100) / 100,
    holdingsCount: activeHoldings.length,
    transactionsCount: transactions.length,
    winRate: Math.round(winRate),
    bestTrade,
    worstTrade,
  };
}

/**
 * Generate ID untuk transaction baru
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Validasi ticker apakah ada di IDX (dengan prefix .JK)
 */
export function normalizeTicker(ticker: string): string {
  return ticker.toUpperCase().trim().replace(".JK", "");
}
